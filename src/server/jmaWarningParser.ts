import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { JmaAreaCode, JmaBulletinType, JmaWarningDecision } from "@/domain/jmaWarning";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: false, allowBooleanAttributes: false, parseTagValue: false, trimValues: true });
const array = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const text = (value: unknown): string => typeof value === "string" ? value.trim() : value && typeof value === "object" && "#text" in value ? String((value as { "#text": unknown })["#text"]).trim() : "";
const children = (node: unknown, key: string): unknown[] => node && typeof node === "object" ? array((node as Record<string, unknown>)[key]) : [];
const descendants = (node: unknown, key: string): unknown[] => {
  if (!node || typeof node !== "object") return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([name, value]) => [...(name === key ? array(value) : []), ...array(value).flatMap((item) => descendants(item, key))]);
};
const valueAt = (node: unknown, ...path: string[]) => text(path.reduce<unknown>((value, key) => children(value, key)[0], node));
const attr = (node: unknown, name: string) => node && typeof node === "object" ? text((node as Record<string, unknown>)[`@_${name}`]) : "";

export type AtomEntry = { type: JmaBulletinType; prefectureCode: string | null; url: string; updated: string };
export function parseAtomFeed(xml: string): AtomEntry[] {
  validateXml(xml);
  const root = parser.parse(xml);
  return descendants(root, "entry").flatMap((entry) => {
    const title = valueAt(entry, "title");
    const links = children(entry, "link");
    const link = links.find((item) => attr(item, "type") === "application/xml");
    const url = attr(link, "href");
    const id = valueAt(entry, "id");
    const updated = valueAt(entry, "updated");
    const match = url.match(/\/(\d{14})_\d+_(VPWS50|VPWP50)_(\d{6})?[^/]*\.xml$/);
    const type = match?.[2] as JmaBulletinType | undefined;
    const expected = type === "VPWS50" ? "気象警報・注意報（Ｒ０６）（集約通報）" : "気象警報・注意報時系列情報（Ｒ０６）";
    const published = Date.parse(updated);
    const fileTime = match ? Date.parse(`${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}T${match[1].slice(8, 10)}:${match[1].slice(10, 12)}:${match[1].slice(12, 14)}Z`) : NaN;
    if (!type || title !== expected || id !== url || !isOfficialUrl(url) || !Number.isFinite(published) || !Number.isFinite(fileTime) || Math.abs(published - fileTime) > 86_400_000) return [];
    return [{ type, prefectureCode: type === "VPWP50" ? match?.[3] ?? null : null, url, updated }];
  });
}

export type ParsedBulletin = { type: JmaBulletinType; reportDateTime: string; status: string; areaName: string; periods: { start: string; end: string; state: "blocked" | "clear" | "unknown"; phenomena: string[] }[] };
const SIGNIFICANCY = {
  "風危険度": { base: "風", codes: { "00": "実況値なし", "01": "注意報級未満", "10": "注意報級", "20": "警報級" } },
  "波危険度": { base: "波", codes: { "00": "実況値なし", "01": "注意報級未満", "10": "注意報級", "20": "警報級" } },
  "雷危険度": { base: "雷", codes: { "00": "実況値なし", "01": "注意報級未満", "10": "注意報級" } },
  "大雨浸水危険度": { base: "大雨", codes: { "00": "実況値なし", "01": "注意報級未満", "10": "注意報級", "20": "警報級" } },
  "土砂災害危険度": { base: "大雨", codes: { "00": "実況値なし", "01": "注意報級未満", "10": "注意報級", "20": "警報級" } },
  "高潮危険度": { base: "高潮", codes: { "00": "実況値なし", "01": "注意報級未満", "10": "注意報級", "20": "警報級" } },
} as const;
const ACTIVE_STATUSES = new Set(["発表", "継続"]);
const CLEAR_STATUSES = new Set(["解除"]);
const UNKNOWN_STATUSES = new Set(["取消", "訂正", "訓練"]);
const WARNING_NAMES = /強風|暴風|風雪|暴風雪|波浪|雷|大雨|高潮/;
const VPWS_CODES: Record<string, RegExp> = {
  "02": /暴風雪/, "03": /大雨/, "04": /暴風/, "06": /波浪/, "07": /高潮/,
  "10": /大雨/, "13": /風雪/, "14": /雷/, "15": /強風/, "16": /波浪/, "19": /高潮/,
};

export function parseBulletin(xml: string, expectedType: JmaBulletinType, area: JmaAreaCode): ParsedBulletin {
  validateXml(xml);
  const report = parser.parse(xml).Report;
  const title = valueAt(report, "Control", "Title");
  const status = valueAt(report, "Control", "Status");
  const kind = valueAt(report, "Head", "InfoKind");
  const version = valueAt(report, "Head", "InfoKindVersion");
  const expectedTitle = expectedType === "VPWS50" ? "気象警報・注意報（Ｒ０６）（集約通報）" : "気象警報・注意報時系列情報（Ｒ０６）";
  const expectedKind = expectedType === "VPWS50" ? "気象警報・注意報" : "気象警報・注意報時系列";
  if (title !== expectedTitle || kind !== expectedKind || !["1.5_0", "1.0_0"].includes(version) || status !== "通常") throw new Error("unsupported-bulletin-schema");
  const reportDateTime = valueAt(report, "Head", "ReportDateTime");
  if (!Number.isFinite(Date.parse(reportDateTime))) throw new Error("invalid-report-time");
  const items = descendants(report, "Item").filter((item) => descendants(item, "Code").some((code) => text(code) === area.municipalityCode));
  if (!items.length) throw new Error("area-missing");
  if (expectedType === "VPWS50") {
    const statuses = items.flatMap((item) => descendants(item, "Kind")).map((kindNode) => ({ name: valueAt(kindNode, "Name"), code: valueAt(kindNode, "Code"), status: valueAt(kindNode, "Status") }));
    const relevant = statuses.filter(({ name }) => WARNING_NAMES.test(name));
    const unsupported = statuses.some(({ name }) => name && !WARNING_NAMES.test(name));
    const unknown = !statuses.length || unsupported || relevant.some(({ name, code, status: infoStatus }) => !VPWS_CODES[code]?.test(name) || UNKNOWN_STATUSES.has(infoStatus) || (!ACTIVE_STATUSES.has(infoStatus) && !CLEAR_STATUSES.has(infoStatus)));
    const active = relevant.filter(({ status: infoStatus }) => ACTIVE_STATUSES.has(infoStatus));
    return { type: expectedType, reportDateTime, status, areaName: area.areaName, periods: [{ start: reportDateTime, end: reportDateTime, state: unknown ? "unknown" : active.length ? "blocked" : "clear", phenomena: active.map(({ name }) => name) }] };
  }
  const defines = new Map(descendants(report, "TimeDefine").map((item) => [attr(item, "timeId"), { start: valueAt(item, "DateTime"), duration: valueAt(item, "Duration") }]));
  if (!defines.size) throw new Error("time-defines-missing");
  const periods = [...defines].map(([id, definition]) => {
    const duration = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(definition.duration);
    const startMs = Date.parse(definition.start);
    if (!id || !duration || !Number.isFinite(startMs)) throw new Error("invalid-time-define");
    const properties = items.flatMap((item) => descendants(item, "Property"));
    const values = properties.flatMap((property) => descendants(property, "Significancy").filter((s) => attr(s, "refID") === id).map((s) => ({ type: valueAt(property, "Type"), base: attr(s, "base") || valueAt(s, "Base"), code: valueAt(s, "Code"), name: valueAt(s, "Name") })));
    const allRefs = properties.flatMap((property) => descendants(property, "Significancy")).map((s) => attr(s, "refID"));
    const inconsistent = !values.length || allRefs.some((ref) => !defines.has(ref)) || values.some(({ type, base, code, name }) => {
      const rule = SIGNIFICANCY[type as keyof typeof SIGNIFICANCY];
      return !rule || base !== rule.base || !(code in rule.codes) || rule.codes[code as keyof typeof rule.codes] !== name || code === "00";
    });
    const end = new Date(startMs + (+duration[1] || 0) * 3600000 + (+duration[2] || 0) * 60000).toISOString();
    if (inconsistent) return { start: definition.start, end, state: "unknown" as const, phenomena: values.map(({ type }) => type) };
    const blocked = values.some(({ code }) => code !== "01");
    return { start: definition.start, end, state: blocked ? "blocked" as const : "clear" as const, phenomena: values.filter(({ code }) => code !== "01").map(({ type, name }) => `${type}: ${name}`) };
  });
  return { type: expectedType, reportDateTime, status, areaName: area.areaName, periods };
}

export function decideJmaWarning(args: { now: Date; selected: Date; area: JmaAreaCode; fetchedAt: string; lastSuccessfulFetchAt?: string | null; vpws?: ParsedBulletin; vpwp?: ParsedBulletin; vpwsError?: string; vpwpError?: string }): JmaWarningDecision {
  const base = { areaName: args.area.areaName, fetchedAt: args.fetchedAt, lastSuccessfulFetchAt: args.lastSuccessfulFetchAt ?? null, phenomena: [] as string[], currentNotice: null as string | null };
  const selectedMs = args.selected.getTime(), nowMs = args.now.getTime();
  if (!Number.isFinite(selectedMs)) return { ...base, state: "unknown", reason: "invalid-selected-time", reportDateTime: null, targetStart: null, targetEnd: null, bulletinType: null };
  if (selectedMs < nowMs - 30 * 60000) return { ...base, state: "unknown", reason: "past-bulletin-not-retained", reportDateTime: null, targetStart: null, targetEnd: null, bulletinType: null };
  const nearNow = Math.abs(selectedMs - nowMs) <= 30 * 60000;
  const source = nearNow ? args.vpws : args.vpwp;
  const freshness = nearNow ? 30 * 60000 : 8 * 3600000;
  const sourceError = nearNow ? args.vpwsError : args.vpwpError;
  if (!source || sourceError || Date.parse(source.reportDateTime) > nowMs + 5 * 60000 || nowMs - Date.parse(source.reportDateTime) > freshness) return { ...base, state: "unknown", reason: sourceError ?? "bulletin-missing-or-stale", reportDateTime: source?.reportDateTime ?? null, targetStart: null, targetEnd: null, bulletinType: nearNow ? "VPWS50" : "VPWP50" };
  if (nearNow) { const p = source.periods[0]; return { ...base, state: p.state, reason: `VPWS50-${p.state}`, phenomena: p.phenomena, reportDateTime: source.reportDateTime, targetStart: null, targetEnd: null, bulletinType: "VPWS50" }; }
  const period = source.periods.find((item) => selectedMs >= Date.parse(item.start) && selectedMs < Date.parse(item.end));
  if (!period) return { ...base, state: "out-of-range", reason: "vpwp-time-range-not-covered", reportDateTime: source.reportDateTime, targetStart: null, targetEnd: null, bulletinType: "VPWP50" };
  return { ...base, state: period.state, reason: `VPWP50-${period.state}`, phenomena: period.phenomena, reportDateTime: source.reportDateTime, targetStart: period.start, targetEnd: period.end, bulletinType: "VPWP50", currentNotice: args.vpws?.periods[0]?.state === "blocked" ? "現在、対象となる警報・注意報が発表されています。" : null };
}

export function validateXml(xml: string) { if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error("invalid-or-unsafe-xml"); }
export function assertXmlSize(xml: string, maxBytes: number) { if (Buffer.byteLength(xml, "utf8") > maxBytes) throw new Error("jma-response-too-large"); }
export function isOfficialUrl(raw: string) { try { const url = new URL(raw); return url.protocol === "https:" && ["www.data.jma.go.jp", "xml.kishou.go.jp"].includes(url.hostname); } catch { return false; } }
