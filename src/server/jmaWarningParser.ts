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
// JMA code.Significancy (2026-07-07) and the VPWP50 R06 manual/sample set
// (2026-03-26 samples); verified 2026-07-20. Only values explicitly allowed by
// those official materials are accepted. 00 is validly encoded but indeterminate.
const SIGNIFICANCY = {
  "風危険度": { clear: { "01": "注意報級未満" }, blocked: { "20": "注意報級", "30": "警報級", "50": "特別警報級" }, local: true },
  "波危険度": { clear: { "01": "注意報級未満" }, blocked: { "20": "注意報級", "30": "警報級", "50": "特別警報級" }, local: false },
  "雷危険度": { clear: { "01": "注意報級未満" }, blocked: { "20": "注意報級" }, local: false },
  "大雨浸水危険度": { clear: { "11": "警戒レベル２未満" }, blocked: { "21": "警戒レベル２", "31": "警戒レベル３相当", "41": "警戒レベル４相当", "51": "警戒レベル５相当" }, local: false },
  "土砂災害危険度": { clear: { "11": "警戒レベル２未満" }, blocked: { "22": "警戒レベル２相当", "31": "警戒レベル３相当", "41": "警戒レベル４相当", "51": "警戒レベル５相当" }, local: false },
  "高潮危険度": { clear: { "11": "警戒レベル２未満" }, blocked: { "21": "警戒レベル２", "31": "警戒レベル３相当", "41": "警戒レベル４相当", "51": "警戒レベル５相当" }, local: true },
} as const;
const REQUIRED_VPWP_TYPES = Object.keys(SIGNIFICANCY) as (keyof typeof SIGNIFICANCY)[];
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
  const timeDefineNodes = descendants(report, "TimeDefine");
  const defines = new Map<string, { start: string; duration: string }>();
  let invalidDefines = false;
  for (const item of timeDefineNodes) {
    const id = attr(item, "timeId");
    const definition = { start: valueAt(item, "DateTime"), duration: valueAt(item, "Duration") };
    if (!id || defines.has(id)) invalidDefines = true;
    else defines.set(id, definition);
  }
  if (!defines.size || invalidDefines) throw new Error("invalid-time-defines");
  const properties = items.flatMap((item) => children(item, "Kind")).flatMap((kindNode) => children(kindNode, "Property"));
  const periods = [...defines].map(([id, definition]) => {
    const duration = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(definition.duration);
    const startMs = Date.parse(definition.start);
    if (!duration || !Number.isFinite(startMs)) throw new Error("invalid-time-define");
    let blocked = false;
    let unknown = false;
    const phenomena: string[] = [];
    for (const type of REQUIRED_VPWP_TYPES) {
      const matching = properties.filter((property) => valueAt(property, "Type") === type);
      if (matching.length !== 1) { unknown = true; continue; }
      const part = children(matching[0], "SignificancyPart");
      const bases = part.length === 1 ? children(part[0], "Base") : [];
      if (bases.length !== 1) { unknown = true; continue; }
      const rule = SIGNIFICANCY[type];
      const locals = children(bases[0], "Local");
      const groups = locals.length ? locals : [bases[0]];
      if (!rule.local && locals.length) { unknown = true; continue; }
      for (const group of groups) {
        if (locals.length && !valueAt(group, "AreaName")) { unknown = true; continue; }
        const values = children(group, "Significancy").filter((value) => attr(value, "refID") === id);
        const allValues = children(group, "Significancy");
        if (values.length !== 1 || allValues.some((value) => !defines.has(attr(value, "refID")))) { unknown = true; continue; }
        const value = values[0];
        const code = valueAt(value, "Code"), name = valueAt(value, "Name");
        if (attr(value, "type") !== type || code === "00") { unknown = true; continue; }
        const clearName = (rule.clear as Record<string, string>)[code];
        const blockedName = (rule.blocked as Record<string, string>)[code];
        if (blockedName === name) { blocked = true; phenomena.push(`${type}: ${name}`); }
        else if (clearName !== name) unknown = true;
      }
    }
    const end = new Date(startMs + (+duration[1] || 0) * 3600000 + (+duration[2] || 0) * 60000).toISOString();
    return { start: definition.start, end, state: blocked ? "blocked" as const : unknown ? "unknown" as const : "clear" as const, phenomena };
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
