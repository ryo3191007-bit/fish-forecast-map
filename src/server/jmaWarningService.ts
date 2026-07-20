import "server-only";
import { JMA_AREA_BY_SPOT, type JmaWarningDecision } from "@/domain/jmaWarning";
import { decideJmaWarning, isOfficialUrl, parseAtomFeed, parseBulletin, type AtomEntry, type ParsedBulletin } from "@/server/jmaWarningParser";

const FEED_URL = "https://www.data.jma.go.jp/developer/xml/feed/regular.xml";
const TIMEOUT_MS = 8_000;
export const DEFAULT_JMA_XML_MAX_BYTES = 3_000_000;
export function resolveJmaXmlMaxBytes(value = process.env.JMA_XML_MAX_BYTES) {
  const parsed = Number(value ?? DEFAULT_JMA_XML_MAX_BYTES);
  return Number.isSafeInteger(parsed) && parsed >= 2_300_000 ? parsed : DEFAULT_JMA_XML_MAX_BYTES;
}
const CACHE_TTL_MS = 5 * 60_000;
type CacheValue = { xml: string; fetchedAt: string; expiresAt: number };
const cache = new Map<string, CacheValue>();
type LastSuccess = { bulletin: ParsedBulletin; fetchedAt: string };
const lastSuccessful = { vpws: new Map<string, LastSuccess>(), vpwp: new Map<string, LastSuccess>() };

export async function fetchJmaXml(url: string): Promise<CacheValue> {
  if (!isOfficialUrl(url)) throw new Error("jma-host-not-allowed");
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/xml, application/atom+xml" }, cache: "no-store" });
    if (!response.ok) throw new Error(`jma-http-${response.status}`);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("xml") && !contentType.includes("octet-stream")) throw new Error("jma-content-type-invalid");
    const length = Number(response.headers.get("content-length") ?? 0);
    const maxBytes = resolveJmaXmlMaxBytes();
    if (length > maxBytes) throw new Error("jma-response-too-large");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error("jma-response-too-large");
    const value = { xml: new TextDecoder().decode(bytes), fetchedAt: new Date().toISOString(), expiresAt: Date.now() + CACHE_TTL_MS };
    cache.set(url, value);
    return value;
  } finally { clearTimeout(timer); }
}

export async function getJmaWarningDecision(spotId: string, selectedIso: string, now = new Date()): Promise<JmaWarningDecision> {
  const area = JMA_AREA_BY_SPOT[spotId];
  const fetchedAt = new Date().toISOString();
  if (!area) return { state: "unknown", reason: "spot-area-not-mapped", phenomena: [], areaName: "区域不明", reportDateTime: null, targetStart: null, targetEnd: null, fetchedAt, bulletinType: null, lastSuccessfulFetchAt: null };
  try {
    const feed = await fetchJmaXml(FEED_URL);
    const entries = parseAtomFeed(feed.xml);
    const vpwsEntry = entries.filter((entry) => entry.type === "VPWS50").sort((a, b) => b.updated.localeCompare(a.updated))[0];
    const vpwpEntry = entries.filter((entry) => entry.type === "VPWP50" && entry.prefectureCode === area.prefectureEntryCode).sort((a, b) => b.updated.localeCompare(a.updated))[0];
    const load = async (type: "vpws" | "vpwp", entry: AtomEntry | undefined) => {
      if (!entry) throw new Error("required-atom-entry-missing");
      const xml = await fetchJmaXml(entry.url); const bulletin = parseBulletin(xml.xml, type === "vpws" ? "VPWS50" : "VPWP50", area);
      lastSuccessful[type].set(spotId, { bulletin, fetchedAt: xml.fetchedAt }); return { bulletin, fetchedAt: xml.fetchedAt };
    };
    const [vpwsResult, vpwpResult] = await Promise.allSettled([load("vpws", vpwsEntry), load("vpwp", vpwpEntry)]);
    const vpwsSuccess = vpwsResult.status === "fulfilled" ? vpwsResult.value : lastSuccessful.vpws.get(spotId);
    const vpwpSuccess = vpwpResult.status === "fulfilled" ? vpwpResult.value : lastSuccessful.vpwp.get(spotId);
    const selected = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(selectedIso) ? selectedIso : `${selectedIso}+09:00`);
    const nearNow = Math.abs(selected.getTime() - now.getTime()) <= 30 * 60000;
    return decideJmaWarning({ now, selected, area, fetchedAt: feed.fetchedAt, lastSuccessfulFetchAt: (nearNow ? vpwsSuccess : vpwpSuccess)?.fetchedAt ?? null, vpws: vpwsSuccess?.bulletin, vpwp: vpwpSuccess?.bulletin, vpwsError: vpwsResult.status === "rejected" ? "current-bulletin-unavailable" : undefined, vpwpError: vpwpResult.status === "rejected" ? "forecast-bulletin-unavailable" : undefined });
  } catch {
    const vpws = lastSuccessful.vpws.get(spotId), vpwp = lastSuccessful.vpwp.get(spotId);
    const selected = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(selectedIso) ? selectedIso : `${selectedIso}+09:00`);
    const nearNow = Math.abs(selected.getTime() - now.getTime()) <= 30 * 60000;
    const primary = nearNow ? vpws : vpwp;
    const previouslyBlocked = primary?.bulletin.periods.some((period) => period.state === "blocked");
    return decideJmaWarning({ now, selected, area, fetchedAt, lastSuccessfulFetchAt: primary?.fetchedAt ?? null, vpws: vpws?.bulletin, vpwp: vpwp?.bulletin, ...(nearNow ? { vpwsError: previouslyBlocked ? "release-not-confirmed-after-blocked" : "current-bulletin-unavailable" } : { vpwpError: previouslyBlocked ? "release-not-confirmed-after-blocked" : "forecast-bulletin-unavailable" }) });
  }
}

/** Test isolation for the stateful server cache. */
export function resetJmaWarningServiceState() {
  cache.clear();
  lastSuccessful.vpws.clear();
  lastSuccessful.vpwp.clear();
}
