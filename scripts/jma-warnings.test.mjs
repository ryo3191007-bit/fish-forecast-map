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

assert.equal(Object.keys(domain.JMA_AREA_BY_SPOT).length, 18);
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

const typeRules = {
  "風危険度": { base: "風", blockedCode: "10", blockedName: "注意報級" },
  "波危険度": { base: "波", blockedCode: "10", blockedName: "注意報級" },
  "雷危険度": { base: "雷", blockedCode: "10", blockedName: "注意報級" },
  "大雨浸水危険度": { base: "大雨", blockedCode: "20", blockedName: "警報級" },
  "土砂災害危険度": { base: "大雨", blockedCode: "20", blockedName: "警報級" },
  "高潮危険度": { base: "高潮", blockedCode: "20", blockedName: "警報級" },
};

function vpwpBulletin({ type = "波危険度", base = typeRules[type]?.base, code = "01", name = "注意報級未満", refID = "1", timeId = "1", omitBase = false } = {}) {
  const baseAttribute = omitBase ? "" : ` base="${base ?? ""}"`;
  return `<Report>${bulletinHead("気象警報・注意報時系列情報（Ｒ０６）", "気象警報・注意報時系列")}<Body><TimeSeriesInfo><TimeDefines><TimeDefine timeId="${timeId}"><DateTime>2026-07-20T13:00:00+09:00</DateTime><Duration>PT3H</Duration></TimeDefine></TimeDefines><Item><Kind><Property><Type>${type}</Type><Significancy refID="${refID}"${baseAttribute}><Name>${name}</Name><Code>${code}</Code></Significancy></Property></Kind><Area><Name>唐津市</Name><Code>4120200</Code></Area></Item></TimeSeriesInfo></Body></Report>`;
}

for (const [type, rule] of Object.entries(typeRules)) {
  assert.equal(parser.parseBulletin(vpwpBulletin({ type, base: rule.base }), "VPWP50", area).periods[0].state, "clear", `${type} clear`);
  assert.equal(parser.parseBulletin(vpwpBulletin({ type, base: rule.base, code: rule.blockedCode, name: rule.blockedName }), "VPWP50", area).periods[0].state, "blocked", `${type} blocked`);
  for (const invalid of [
    { type, base: rule.base, name: "不一致" },
    { type, base: "不一致" },
    { type, omitBase: true },
    { type, base: rule.base, refID: "999" },
    { type, base: rule.base, refID: "" },
    { type, base: rule.base, code: "99", name: "未知" },
    { type, base: rule.base, code: "", name: "" },
  ]) {
    assert.equal(parser.parseBulletin(vpwpBulletin(invalid), "VPWP50", area).periods[0].state, "unknown", `${type} invalid metadata`);
  }
}
assert.equal(parser.parseBulletin(vpwpBulletin({ type: "未知危険度", base: "風" }), "VPWP50", area).periods[0].state, "unknown");

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

const unknownPresentation = presentation.getJmaWarningPresentation({
  ...apiDecision,
  state: "unknown",
  reason: "release-not-confirmed-after-blocked",
});
assert.equal(unknownPresentation.unknownReason, "発表済み情報の解除を確認できません。");
assert.equal(unknownPresentation.lastSuccessfulFetchAt, now.toISOString(), "UI presentation preserves the last successful fetch time");
assert.throws(() => parser.validateXml('<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]><x>&y;</x>'), /unsafe/);

console.log("JMA acquisition, service, parser, Atom, safety-gate tests passed.");
