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
    const match = url.match(/_(VPWS50|VPWP50)_(\d{6})?[^/]*\.xml$/);
    const type = match?.[1] as JmaBulletinType | undefined;
    const expected = type === "VPWS50" ? "気象警報・注意報（Ｒ０６）（集約通報）" : "気象警報・注意報時系列情報（Ｒ０６）";
    if (!type || title !== expected || !isOfficialUrl(url)) return [];
    return [{ type, prefectureCode: type === "VPWP50" ? match?.[2] ?? null : null, url, updated: valueAt(entry, "updated") }];
  });
}

export type ParsedBulletin = { type: JmaBulletinType; reportDateTime: string; status: string; areaName: string; periods: { start: string; end: string; state: "blocked" | "clear" | "unknown"; phenomena: string[] }[] };
const TARGET_TYPES = new Set(["風危険度", "波危険度", "雷危険度", "大雨浸水危険度", "土砂災害危険度", "高潮危険度"]);
const BLOCKED_CODES = new Set(["10", "20", "30", "40", "50", "60"]);
const CLEAR_CODES = new Set(["01", "02", "03", "04"]);
const WARNING_NAMES = /強風|暴風|風雪|暴風雪|波浪|雷|大雨|高潮/;

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
    const statuses = items.flatMap((item) => descendants(item, "Kind")).map((kindNode) => ({ name: valueAt(kindNode, "Name"), code: valueAt(kindNode, "Code") }));
    const relevant = statuses.filter(({ name }) => WARNING_NAMES.test(name));
    const unknown = relevant.some(({ code }) => !code || code === "00");
    return { type: expectedType, reportDateTime, status, areaName: area.areaName, periods: [{ start: reportDateTime, end: reportDateTime, state: unknown ? "unknown" : relevant.length ? "blocked" : "clear", phenomena: relevant.map(({ name }) => name) }] };
  }
  const defines = new Map(descendants(report, "TimeDefine").map((item) => [attr(item, "timeId"), { start: valueAt(item, "DateTime"), duration: valueAt(item, "Duration") }]));
  if (!defines.size) throw new Error("time-defines-missing");
  const periods = [...defines].map(([id, definition]) => {
    const duration = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(definition.duration);
    const startMs = Date.parse(definition.start);
    if (!id || !duration || !Number.isFinite(startMs)) throw new Error("invalid-time-define");
    const values = items.flatMap((item) => descendants(item, "Property")).filter((property) => TARGET_TYPES.has(valueAt(property, "Type"))).flatMap((property) => descendants(property, "Significancy").filter((significancy) => attr(significancy, "refID") === id).map((significancy) => ({ type: valueAt(property, "Type"), code: valueAt(significancy, "Code"), name: valueAt(significancy, "Name") })));
    if (!values.length || values.some(({ code }) => !BLOCKED_CODES.has(code) && !CLEAR_CODES.has(code))) return { start: definition.start, end: new Date(startMs + (+duration[1] || 0) * 3600000 + (+duration[2] || 0) * 60000).toISOString(), state: "unknown" as const, phenomena: values.map(({ type }) => type) };
    return { start: definition.start, end: new Date(startMs + (+duration[1] || 0) * 3600000 + (+duration[2] || 0) * 60000).toISOString(), state: values.some(({ code }) => BLOCKED_CODES.has(code)) ? "blocked" as const : "clear" as const, phenomena: values.filter(({ code }) => BLOCKED_CODES.has(code)).map(({ type, name }) => `${type}: ${name}`) };
  });
  return { type: expectedType, reportDateTime, status, areaName: area.areaName, periods };
}

export function decideJmaWarning(args: { now: Date; selected: Date; area: JmaAreaCode; fetchedAt: string; vpws?: ParsedBulletin; vpwp?: ParsedBulletin; error?: string }): JmaWarningDecision {
  const base = { areaName: args.area.areaName, fetchedAt: args.fetchedAt, lastSuccessfulFetchAt: args.vpwp?.reportDateTime ?? args.vpws?.reportDateTime ?? null, phenomena: [] as string[], currentNotice: null as string | null };
  const selectedMs = args.selected.getTime(), nowMs = args.now.getTime();
  if (!Number.isFinite(selectedMs)) return { ...base, state: "unknown", reason: "invalid-selected-time", reportDateTime: null, targetStart: null, targetEnd: null, bulletinType: null };
  if (selectedMs < nowMs - 30 * 60000) return { ...base, state: "unknown", reason: "past-bulletin-not-retained", reportDateTime: null, targetStart: null, targetEnd: null, bulletinType: null };
  const nearNow = Math.abs(selectedMs - nowMs) <= 30 * 60000;
  const source = nearNow ? args.vpws : args.vpwp;
  const freshness = nearNow ? 30 * 60000 : 8 * 3600000;
  if (!source || args.error || Date.parse(source.reportDateTime) > nowMs + 5 * 60000 || nowMs - Date.parse(source.reportDateTime) > freshness) return { ...base, state: "unknown", reason: args.error ?? "bulletin-missing-or-stale", reportDateTime: source?.reportDateTime ?? null, targetStart: null, targetEnd: null, bulletinType: nearNow ? "VPWS50" : "VPWP50" };
  if (nearNow) { const p = source.periods[0]; return { ...base, state: p.state, reason: `VPWS50-${p.state}`, phenomena: p.phenomena, reportDateTime: source.reportDateTime, targetStart: null, targetEnd: null, bulletinType: "VPWS50" }; }
  const period = source.periods.find((item) => selectedMs >= Date.parse(item.start) && selectedMs < Date.parse(item.end));
  if (!period) return { ...base, state: "out-of-range", reason: "vpwp-time-range-not-covered", reportDateTime: source.reportDateTime, targetStart: null, targetEnd: null, bulletinType: "VPWP50" };
  return { ...base, state: period.state, reason: `VPWP50-${period.state}`, phenomena: period.phenomena, reportDateTime: source.reportDateTime, targetStart: period.start, targetEnd: period.end, bulletinType: "VPWP50", currentNotice: args.vpws?.periods[0]?.state === "blocked" ? "現在、対象となる警報・注意報が発表されています。" : null };
}

export function validateXml(xml: string) { if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error("invalid-or-unsafe-xml"); }
export function isOfficialUrl(raw: string) { try { const url = new URL(raw); return url.protocol === "https:" && ["www.data.jma.go.jp", "xml.kishou.go.jp"].includes(url.hostname); } catch { return false; } }
