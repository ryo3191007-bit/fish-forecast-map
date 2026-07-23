import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

fs.mkdirSync(path.join(process.cwd(), ".next"), { recursive: true });
const temporaryDirectory = fs.mkdtempSync(path.join(process.cwd(), ".next/jma-tests-"));

function compile(sourcePath, outputName, replacements = {}) {
  let source = fs.readFileSync(sourcePath, "utf8");
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  fs.writeFileSync(path.join(temporaryDirectory, outputName), output);
}

compile("src/domain/jmaWarning.ts", "domain.mjs");
compile("src/server/jmaWarningParser.ts", "parser.mjs", {
  '"@/domain/jmaWarning"': '"./domain.mjs"',
});
compile("src/server/jmaWarningService.ts", "service.mjs", {
  'import "server-only";': "",
  '"@/domain/jmaWarning"': '"./domain.mjs"',
  '"@/server/jmaWarningParser"': '"./parser.mjs"',
});
compile("src/domain/jmaWarningPresentation.ts", "presentation.mjs", {
  '"@/domain/jmaWarning"': '"./domain.mjs"',
});
fs.writeFileSync(path.join(temporaryDirectory, "next-response.mjs"), `export const NextResponse = { json(body, init = {}) { return Response.json(body, init); } };`);
compile("src/server/jmaWarningsRoute.ts", "route.mjs", {
  '"next/server"': '"./next-response.mjs"',
  '"@/server/jmaWarningService"': '"./service.mjs"',
});

const domain = await import(path.join(temporaryDirectory, "domain.mjs"));
const parser = await import(path.join(temporaryDirectory, "parser.mjs"));
const service = await import(path.join(temporaryDirectory, "service.mjs"));
const presentation = await import(path.join(temporaryDirectory, "presentation.mjs"));
const route = await import(path.join(temporaryDirectory, "route.mjs"));
const area = domain.JMA_AREA_BY_SPOT["karatsu-east-port"];
const now = new Date("2026-07-20T03:10:00Z");

assert.equal(Object.keys(domain.JMA_AREA_BY_SPOT).length, 36);
assert.equal(area.municipalityCode, "4120200");

const vpwsUrl = "https://www.data.jma.go.jp/developer/xml/data/20260720030000_0_VPWS50_000000.xml";
const vpwpUrl = "https://www.data.jma.go.jp/developer/xml/data/20260720030000_0_VPWP50_410000.xml";

function atomEntry({ type, url, title, id = url, updated = "2026-07-20T03:00:00Z" }) {
  const expectedTitle = title ?? (type === "VPWS50"
    ? "気象警報・注意報（Ｒ０６）（集約通報）"
    : "気象警報・注意報時系列情報（Ｒ０６）");
  return `<entry><title>${expectedTitle}</title><id>${id}</id><updated>${updated}</updated><link type="application/xml" href="${url}"/></entry>`;
}

function atomFeed(entries = [
  atomEntry({ type: "VPWS50", url: vpwsUrl }),
  atomEntry({ type: "VPWP50", url: vpwpUrl }),
]) {
  return `<?xml version="1.0"?><feed>${entries.join("")}</feed>`;
}

const validEntries = parser.parseAtomFeed(atomFeed());
assert.equal(validEntries.length, 2, "valid Atom entries are accepted");
for (const invalidEntry of [
  atomEntry({ type: "VPWS50", url: vpwsUrl, id: "" }),
  atomEntry({ type: "VPWS50", url: vpwsUrl, id: vpwpUrl }),
  atomEntry({ type: "VPWS50", url: "https://www.data.jma.go.jp/not-a-bulletin.xml" }),
  atomEntry({ type: "VPWS50", url: vpwsUrl, updated: "not-a-date" }),
  atomEntry({ type: "VPWS50", url: vpwsUrl, updated: "2025-01-01T00:00:00Z" }),
  atomEntry({ type: "VPWS50", url: vpwsUrl, title: "different" }),
]) {
  assert.equal(parser.parseAtomFeed(atomFeed([invalidEntry])).length, 0, "inconsistent Atom metadata is rejected");
}

function bulletinHead(title, kind) {
  return `<Control><Title>${title}</Title><Status>通常</Status></Control><Head><ReportDateTime>2026-07-20T12:00:00+09:00</ReportDateTime><InfoKind>${kind}</InfoKind><InfoKindVersion>1.5_0</InfoKindVersion></Head>`;
}

function vpwsBulletin({ name = "強風注意報", code = "15", status = "発表", omit = "" } = {}) {
  const kind = `<Kind>${omit === "name" ? "" : `<Name>${name}</Name>`}${omit === "code" ? "" : `<Code>${code}</Code>`}${omit === "status" ? "" : `<Status>${status}</Status>`}</Kind>`;
  return `<Report>${bulletinHead("気象警報・注意報（Ｒ０６）（集約通報）", "気象警報・注意報")}<Body><Item>${kind}<Area><Name>唐津市</Name><Code>4120200</Code></Area></Item></Body></Report>`;
}

assert.equal(parser.parseBulletin(vpwsBulletin(), "VPWS50", area).periods[0].state, "blocked");
assert.equal(parser.parseBulletin(vpwsBulletin({ status: "継続" }), "VPWS50", area).periods[0].state, "blocked");
assert.equal(parser.parseBulletin(vpwsBulletin({ status: "解除" }), "VPWS50", area).periods[0].state, "clear");
for (const xml of [
  vpwsBulletin({ omit: "status" }),
  vpwsBulletin({ status: "未知" }),
  vpwsBulletin({ status: "取消" }),
  vpwsBulletin({ status: "訂正" }),
  vpwsBulletin({ status: "訓練" }),
  vpwsBulletin({ omit: "code" }),
  vpwsBulletin({ code: "99" }),
  vpwsBulletin({ name: "濃霧注意報", code: "15" }),
  vpwsBulletin({ name: "波浪注意報", code: "15" }),
]) {
  assert.equal(parser.parseBulletin(xml, "VPWS50", area).periods[0].state, "unknown", "unsupported VPWS50 data fails closed");
}

// Fixed expectations below come from JMA code.Significancy (2026-07-07), not
// from the production mapping. The fixture preserves the official Base/Local hierarchy.
const officialVpwpFixture = fs.readFileSync("scripts/fixtures/jma/vpwp50-official-excerpt.xml", "utf8");
function vpwpBulletin() { return officialVpwpFixture; }
function replaceOnce(xml, from, to) {
  assert.ok(xml.includes(from), `fixture token exists: ${from}`);
  return xml.replace(from, to);
}
assert.equal(parser.parseBulletin(officialVpwpFixture, "VPWP50", area).periods[0].state, "clear", "all six official properties clear");
const fixedBlockedCases = [
  ["風危険度", "<Name>注意報級未満</Name><Code>01</Code>", "<Name>注意報級</Name><Code>20</Code>"],
  ["波危険度", "<Name>注意報級未満</Name><Code>01</Code>", "<Name>警報級</Name><Code>30</Code>"],
  ["雷危険度", "<Name>注意報級未満</Name><Code>01</Code>", "<Name>注意報級</Name><Code>20</Code>"],
  ["大雨浸水危険度", "<Name>警戒レベル２未満</Name><Code>11</Code>", "<Name>警戒レベル３相当</Name><Code>31</Code>"],
  ["土砂災害危険度", "<Name>警戒レベル２未満</Name><Code>11</Code>", "<Name>警戒レベル４相当</Name><Code>41</Code>"],
  ["高潮危険度", "<Name>警戒レベル２未満</Name><Code>11</Code>", "<Name>警戒レベル２</Name><Code>21</Code>"],
];
for (const [type, clearValue, blockedValue] of fixedBlockedCases) {
  const marker = `<Significancy refID="1" type="${type}">${clearValue}`;
  const changed = `<Significancy refID="1" type="${type}">${blockedValue}`;
  assert.equal(parser.parseBulletin(replaceOnce(officialVpwpFixture, marker, changed), "VPWP50", area).periods[0].state, "blocked", `${type} official blocked code/name`);
}
const unknownFixtures = [
  replaceOnce(officialVpwpFixture, '<Code>01</Code>', '<Code>00</Code>'),
  replaceOnce(officialVpwpFixture, '<Code>01</Code>', '<Code>99</Code>'),
  replaceOnce(officialVpwpFixture, '<Code>01</Code>', ''),
  replaceOnce(officialVpwpFixture, '<Name>注意報級未満</Name>', '<Name>不一致</Name>'),
  replaceOnce(officialVpwpFixture, 'refID="1" type="波危険度"', 'refID="missing" type="波危険度"'),
  replaceOnce(officialVpwpFixture, 'type="雷危険度"><Name>', 'type="未知危険度"><Name>'),
  replaceOnce(officialVpwpFixture, '<Kind><Status>発表</Status><Property><Type>波危険度</Type>', '<Kind><Status>発表</Status><Property><Type>未知危険度</Type>'),
  replaceOnce(officialVpwpFixture, '<Kind><Status>発表</Status><Property><Type>波危険度</Type><SignificancyPart>', '<Kind><Status>発表</Status><Property><Type>波危険度</Type>'),
  replaceOnce(officialVpwpFixture, '<Local><AreaName>海上</AreaName>', '<Local><AreaName></AreaName>'),
  replaceOnce(officialVpwpFixture, '<TimeDefine timeId="1">', '<TimeDefine timeId="1"></TimeDefine><TimeDefine timeId="1">'),
];
for (const xml of unknownFixtures) {
  let state = "unknown";
  try { state = parser.parseBulletin(xml, "VPWP50", area).periods[0].state; } catch { /* malformed required structure is unknown to the service */ }
  assert.equal(state, "unknown", "missing or inconsistent official VPWP50 data fails closed");
}
const waveProperty = /<Kind><Status>発表<\/Status><Property><Type>波危険度<\/Type>[\s\S]*?<\/Property><\/Kind>/;
assert.equal(parser.parseBulletin(officialVpwpFixture.replace(waveProperty, ""), "VPWP50", area).periods[0].state, "unknown", "wind clear plus missing wave is unknown");
const oneLocalMissing = replaceOnce(officialVpwpFixture, '<Local><AreaName>海上</AreaName><Significancy refID="1" type="風危険度"><Name>注意報級未満</Name><Code>01</Code></Significancy></Local>', '<Local><AreaName>海上</AreaName></Local>');
assert.equal(parser.parseBulletin(oneLocalMissing, "VPWP50", area).periods[0].state, "unknown", "one of multiple Local bases missing is unknown");
const blockedAndMalformed = replaceOnce(replaceOnce(officialVpwpFixture, '<Significancy refID="1" type="波危険度"><Name>注意報級未満</Name><Code>01</Code>', '<Significancy refID="1" type="波危険度"><Name>警報級</Name><Code>30</Code>'), '<Code>11</Code>', '<Code>99</Code>');
assert.equal(parser.parseBulletin(blockedAndMalformed, "VPWP50", area).periods[0].state, "blocked", "blocked takes priority while another property remains inconsistent");

function response(body, { status = 200, contentLength, contentType = "application/xml" } = {}) {
  return new Response(body, {
    status,
    headers: {
      "content-type": contentType,
      ...(contentLength === undefined ? {} : { "content-length": String(contentLength) }),
    },
  });
}

const originalFetch = globalThis.fetch;
const originalMaximum = process.env.JMA_XML_MAX_BYTES;
try {
  const largeXml = `<?xml version="1.0"?><feed>${"<!-- harmless padding -->".repeat(100_000)}</feed>`;
  assert.ok(Buffer.byteLength(largeXml, "utf8") > 2_200_000);
  process.env.JMA_XML_MAX_BYTES = "2600000";
  service.resetJmaWarningServiceState();
  globalThis.fetch = async () => response(largeXml);
  assert.equal((await service.fetchJmaXml("https://www.data.jma.go.jp/developer/xml/feed/regular.xml")).xml.length, largeXml.length, "2.2 MB XML passes through production fetch");

  service.resetJmaWarningServiceState();
  globalThis.fetch = async () => response("<feed/>", { contentLength: 2_600_001 });
  await assert.rejects(service.fetchJmaXml("https://www.data.jma.go.jp/developer/xml/feed/regular.xml"), /too-large/, "Content-Length is enforced");

  service.resetJmaWarningServiceState();
  globalThis.fetch = async () => response(`${largeXml}x`.padEnd(2_600_001, "x"));
  await assert.rejects(service.fetchJmaXml("https://www.data.jma.go.jp/developer/xml/feed/regular.xml"), /too-large/, "actual arrayBuffer size is enforced");

  assert.equal(service.resolveJmaXmlMaxBytes("2400000"), 2_400_000);
  assert.equal(service.resolveJmaXmlMaxBytes("invalid"), 3_000_000);
} finally {
  globalThis.fetch = originalFetch;
  if (originalMaximum === undefined) delete process.env.JMA_XML_MAX_BYTES;
  else process.env.JMA_XML_MAX_BYTES = originalMaximum;
}

async function serviceScenario({ vpws = vpwsBulletin(), vpwp = vpwpBulletin(), entries, selected = "2026-07-20T03:15:00Z" } = {}) {
  service.resetJmaWarningServiceState();
  let requests = 0;
  globalThis.fetch = async (input) => {
    requests += 1;
    const url = String(input);
    if (url.endsWith("regular.xml")) return response(atomFeed(entries));
    if (url === vpwsUrl) return vpws instanceof Error ? Promise.reject(vpws) : response(vpws);
    if (url === vpwpUrl) return vpwp instanceof Error ? Promise.reject(vpwp) : response(vpwp);
    throw new Error(`unexpected test URL: ${url}`);
  };
  const decision = await service.getJmaWarningDecision("karatsu-east-port", selected, now);
  return { decision, requests };
}

try {
  assert.equal((await serviceScenario({ vpws: new Error("VPWS fail") })).decision.state, "unknown", "VPWS-only failure executes service fallback");
  assert.equal((await serviceScenario({ vpwp: new Error("VPWP fail"), selected: "2026-07-20T05:00:00Z" })).decision.state, "unknown", "VPWP-only failure executes service fallback");
  assert.equal((await serviceScenario({ vpws: new Error("primary fail"), selected: "2026-07-20T03:15:00Z" })).decision.reason, "current-bulletin-unavailable");
  assert.equal((await serviceScenario({ entries: [atomEntry({ type: "VPWP50", url: vpwpUrl })] })).decision.state, "unknown", "missing Atom entry fails closed");

  const cached = await serviceScenario();
  const firstFetchCount = cached.requests;
  await service.getJmaWarningDecision("karatsu-east-port", "2026-07-20T03:15:00Z", now);
  assert.equal(cached.requests, firstFetchCount, "service reuses feed and bulletin caches");
  assert.match(cached.decision.lastSuccessfulFetchAt, /^\d{4}-\d{2}-\d{2}T/, "real successful fetch time reaches the decision");

  service.resetJmaWarningServiceState();
  const realDateNow = Date.now;
  let clock = realDateNow();
  Date.now = () => clock;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("regular.xml")) return response(atomFeed());
    if (url === vpwsUrl) return response(vpwsBulletin());
    return response(vpwpBulletin());
  };
  const blocked = await service.getJmaWarningDecision("karatsu-east-port", "2026-07-20T03:15:00Z", now);
  clock += 6 * 60_000;
  globalThis.fetch = async () => Promise.reject(new Error("network down"));
  const afterFailure = await service.getJmaWarningDecision("karatsu-east-port", "2026-07-20T03:15:00Z", now);
  Date.now = realDateNow;
  assert.equal(blocked.state, "blocked");
  assert.equal(afterFailure.state, "unknown");
  assert.equal(afterFailure.reason, "release-not-confirmed-after-blocked");
} finally {
  globalThis.fetch = originalFetch;
}

const current = parser.parseBulletin(vpwsBulletin(), "VPWS50", area);
const future = parser.parseBulletin(vpwpBulletin(), "VPWP50", area);
const decide = (selected) => parser.decideJmaWarning({ now, selected: new Date(selected), area, fetchedAt: now.toISOString(), vpws: current, vpwp: future });
assert.equal(decide("2026-07-20T03:15:00Z").state, "blocked");
assert.equal(decide("2026-07-20T05:00:00Z").state, "clear");
assert.equal(decide("2026-07-21T07:00:00Z").state, "out-of-range");
assert.equal(domain.combineSafetyGate({ state: "blocked" }, "clear").displayOverallScore, false);

const decision = (state, overrides = {}) => ({ state, reason: `${state}-fixture`, phenomena: [], areaName: "佐賀県唐津市", reportDateTime: null, targetStart: null, targetEnd: null, fetchedAt: now.toISOString(), bulletinType: null, lastSuccessfulFetchAt: null, ...overrides });
assert.deepEqual(presentation.getJmaWarningDisplay(null), { kind: "loading" }, "loading does not preemptively show a failure");
assert.equal(presentation.getJmaWarningDisplay(decision("blocked")).kind, "blocked", "blocked uses the detailed presentation");
assert.deepEqual(presentation.getJmaWarningDisplay(decision("clear")), { kind: "hidden" }, "clear has no safety-gate UI");
assert.deepEqual(presentation.getJmaWarningDisplay(decision("out-of-range")), { kind: "hidden" }, "JMA out-of-range has no JMA detail UI");
assert.deepEqual(presentation.getJmaWarningDisplay(decision("unknown", { reason: "private-exception-text" })), { kind: "unknown", message: "安全情報を取得できませんでした。総合点は表示しません。" }, "unknown exposes only a generic compact message");
assert.deepEqual(presentation.getJmaWarningDisplay(decision("future-state")), { kind: "unknown", message: "安全情報を取得できませんでした。総合点は表示しません。" }, "an unexpected runtime state fails closed in the safety UI");

assert.equal(domain.combineSafetyGate(decision("blocked"), "clear").displayOverallScore, false, "blocked suppresses overall scores");
assert.equal(domain.combineSafetyGate(decision("unknown"), "clear").displayOverallScore, false, "unknown suppresses overall scores");
assert.equal(domain.combineSafetyGate(decision("out-of-range"), "clear").displayOverallScore, true, "out-of-range delegates a clear result to Open-Meteo");
assert.equal(domain.combineSafetyGate(decision("out-of-range"), "blocked").displayOverallScore, false, "out-of-range plus Open-Meteo danger suppresses scores");
assert.equal(domain.combineSafetyGate(decision("out-of-range"), "unknown").displayOverallScore, false, "out-of-range plus unknown Open-Meteo data suppresses scores");
assert.equal(domain.combineSafetyGate({ state: "unknown" }, "clear").displayOverallScore, false);
const outOfRangeBlocked = domain.combineSafetyGate({ state: "out-of-range" }, "blocked");
assert.equal(outOfRangeBlocked.state, "blocked-open-meteo");
assert.equal(outOfRangeBlocked.displayOverallScore, false);
const outOfRangeClear = domain.combineSafetyGate({ state: "out-of-range" }, "clear");
assert.equal(outOfRangeClear.state, "clear");
assert.equal(outOfRangeClear.displayOverallScore, true);

const apiDecision = {
  state: "clear",
  reason: "VPWS50-clear",
  phenomena: [],
  areaName: "唐津市",
  reportDateTime: now.toISOString(),
  targetStart: null,
  targetEnd: null,
  fetchedAt: now.toISOString(),
  bulletinType: "VPWS50",
  lastSuccessfulFetchAt: now.toISOString(),
};
const normalApiResponse = await route.handleJmaWarningsRequest(
  new Request("https://example.test/api/jma-warnings?spotId=karatsu-east-port&selected=2026-07-20T03%3A15%3A00Z"),
  async () => apiDecision,
);
assert.equal(normalApiResponse.status, 200);
assert.equal((await normalApiResponse.json()).state, "clear", "API normal response uses the route implementation");
const unknownApiResponse = await route.handleJmaWarningsRequest(
  new Request("https://example.test/api/jma-warnings?spotId=karatsu-east-port&selected=2026-07-20T03%3A15%3A00Z"),
  async () => ({ ...apiDecision, state: "unknown", reason: "current-bulletin-unavailable" }),
);
assert.equal((await unknownApiResponse.json()).state, "unknown", "API preserves fail-closed decisions");

const unknownPresentation = presentation.getJmaWarningDisplay({
  ...apiDecision,
  state: "unknown",
  reason: "release-not-confirmed-after-blocked",
});
assert.deepEqual(unknownPresentation, { kind: "unknown", message: "安全情報を取得できませんでした。総合点は表示しません。" }, "a failed refresh after blocked stays unknown without exposing its internal reason");
assert.throws(() => parser.validateXml('<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]><x>&y;</x>'), /unsafe/);

console.log("JMA acquisition, service, parser, Atom, safety-gate tests passed.");
