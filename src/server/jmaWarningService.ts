import "server-only";
import { JMA_AREA_BY_SPOT, type JmaWarningDecision } from "@/domain/jmaWarning";
import { decideJmaWarning, isOfficialUrl, parseAtomFeed, parseBulletin, type ParsedBulletin } from "@/server/jmaWarningParser";

const FEED_URL = "https://www.data.jma.go.jp/developer/xml/feed/regular.xml";
const TIMEOUT_MS = 8_000;
const MAX_BYTES = 2_000_000;
const CACHE_TTL_MS = 5 * 60_000;
type CacheValue = { xml: string; fetchedAt: string; expiresAt: number };
const cache = new Map<string, CacheValue>();
const lastSuccessful = new Map<string, { vpws?: ParsedBulletin; vpwp?: ParsedBulletin; fetchedAt: string }>();

async function fetchXml(url: string): Promise<CacheValue> {
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
    if (length > MAX_BYTES) throw new Error("jma-response-too-large");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) throw new Error("jma-response-too-large");
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
    const feed = await fetchXml(FEED_URL);
    const entries = parseAtomFeed(feed.xml);
    const vpwsEntry = entries.filter((entry) => entry.type === "VPWS50").sort((a, b) => b.updated.localeCompare(a.updated))[0];
    const vpwpEntry = entries.filter((entry) => entry.type === "VPWP50" && entry.prefectureCode === area.prefectureEntryCode).sort((a, b) => b.updated.localeCompare(a.updated))[0];
    if (!vpwsEntry || !vpwpEntry) throw new Error("required-atom-entry-missing");
    const [vpwsXml, vpwpXml] = await Promise.all([fetchXml(vpwsEntry.url), fetchXml(vpwpEntry.url)]);
    const vpws = parseBulletin(vpwsXml.xml, "VPWS50", area);
    const vpwp = parseBulletin(vpwpXml.xml, "VPWP50", area);
    lastSuccessful.set(spotId, { vpws, vpwp, fetchedAt: feed.fetchedAt });
    const selected = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(selectedIso) ? selectedIso : `${selectedIso}+09:00`);
    return decideJmaWarning({ now, selected, area, fetchedAt: feed.fetchedAt, vpws, vpwp });
  } catch (error) {
    const previous = lastSuccessful.get(spotId);
    const reason = error instanceof Error ? error.message : "jma-fetch-failed";
    const previousBlocked = previous && [previous.vpws, previous.vpwp].some((item) => item?.periods.some((period) => period.state === "blocked"));
    const selected = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(selectedIso) ? selectedIso : `${selectedIso}+09:00`);
    return decideJmaWarning({ now, selected, area, fetchedAt, vpws: previous?.vpws, vpwp: previous?.vpwp, error: previousBlocked ? "release-not-confirmed-after-blocked" : reason });
  }
}
