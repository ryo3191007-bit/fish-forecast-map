import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { fishingSpots } from "../src/data/fishingSpots";
import { buildCatchRegistrationSpotOptions, buildFishingSpotMapEntries, selectFishingSpot, toEnvironmentPoint } from "../src/domain/fishingSpotPresentation";
import { getTideReferenceForSpot } from "../src/domain/environment";
import { JMA_AREA_BY_SPOT } from "../src/domain/jmaWarning";
import { fetchFishingEnvironment } from "../src/services/openMeteo";
const EXPECTED = new Map([
["tasuke-fishing-port",["田助漁港","漁港",33.3909,129.5560]],["usukawan-fishing-port",["薄香湾漁港","漁港",33.3607,129.5268]],["hoki-fishing-port",["宝亀漁港","漁港",33.3077,129.5575]],["shin-shishi-fishing-port",["新獅子漁港","漁港",33.281,129.4408]],["himosashi-port",["紐差港","その他",33.257,129.587]],["maetsuyoshi-fishing-port",["前津吉漁港","漁港",33.1858,129.5148]],["shijikiura-fishing-port",["志々伎浦漁港","漁港",33.2016,129.4079]],["miyanoura-fishing-port",["宮ノ浦漁港","漁港",33.1917,129.4025]],
] as const);
const UNKNOWN=["restriction_status","fishable_area","access","parking","toilet","lighting","shore_access","depth","bottom_material","coastal_topography","obstacles","spot_features","target_species","recommended_methods"];
type Audit={activeCandidates:{spotId:string}[];heldOrExcluded:{name:string;decision:string}[];sources:Record<string,unknown>;migrationPolicy:string[]};
type DetailValue={itemKey:string;informationState:string;valueText:null;valueTextList:string[];valueNumber:null;valueBoolean:null;confidence:null;sources:{supporting:string[]}};
type Details={spots:{spotId:string;values:DetailValue[]}[]};
const audit=JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-253-hirado-implementation-input.json","utf8")) as Audit;
const details=JSON.parse(fs.readFileSync("data/curation/fishing-spots/issue-253-detail-curation.json","utf8")) as Details;
const seed=fs.readFileSync("supabase/sql/003_master_data_seed.sql","utf8"); const migration=fs.readFileSync("supabase/migrations/20260723090000_add_issue_253_hirado_main_spots.sql","utf8");
const before=[fs.readFileSync("supabase/migrations/20260723010000_add_issue_252_hirado_seto_spots.sql","utf8"),fs.readFileSync("supabase/migrations/20260723050000_add_issue_254_ikitsuki_spots.sql","utf8")];
const fallback=fs.readFileSync("src/lib/fishingSpotDetailFallback.ts","utf8");
const uuid=(id:string)=>createHash("md5").update(id).digest("hex");
assert.equal(fishingSpots.length,52); assert.equal(new Set(fishingSpots.map(s=>s.id)).size,52); assert.deepEqual(new Set(audit.activeCandidates.map((x)=>x.spotId)),new Set(EXPECTED.keys()));
assert.equal(fishingSpots.filter(s=>s.id==="hirado-port").length,1); assert.ok(audit.heldOrExcluded.every((x)=>!EXPECTED.has(x.name)));
for(const [id,[name,type,lat,lon]] of EXPECTED){ const s=fishingSpots.find(x=>x.id===id); assert.ok(s); assert.deepEqual([s.name,s.spotType,s.latitude,s.longitude,s.coordinatePrecision,s.areaName],[name,type,lat,lon,"approximate","平戸"]); assert.ok(lat>=33.18&&lat<=33.40&&lon>=129.40&&lon<=129.60); assert.deepEqual(s.targetSpecies,[]); assert.deepEqual(s.recommendedMethods,[]); for(const sql of [seed,migration]) assert.match(sql,new RegExp(`\\('${id}', '${name}', '平戸', ${lat}, ${lon}, '${type}'`)); assert.deepEqual(JMA_AREA_BY_SPOT[id],{prefectureEntryCode:"420000",municipalityCode:"4220700",areaName:"長崎県平戸市"}); assert.equal(getTideReferenceForSpot(id).referenceName,"平戸瀬戸"); assert.equal(selectFishingSpot(fishingSpots,id)?.id,id); assert.deepEqual(buildFishingSpotMapEntries(fishingSpots).find(x=>x.spot.id===id)?.coordinates,[lon,lat]); assert.ok(buildCatchRegistrationSpotOptions(fishingSpots).some(x=>x.id===id)); const urls:string[]=[]; await fetchFishingEnvironment(toEnvironmentPoint(s),{storage:null,now:()=>new Date("2026-07-23T00:00:00Z"),fetchImpl:async(input:string)=>{urls.push(input);return {ok:true,status:200,json:async()=>({hourly:{time:["2026-07-23T00:00"],temperature_2m:[25],wave_height:[.5]}})}}}); assert.ok(urls.every(x=>new URL(x).searchParams.get("latitude")===String(lat))); const c=details.spots.find((x)=>x.spotId===id); assert.ok(c); for(const k of UNKNOWN){const v=c.values.find((x)=>x.itemKey===k);assert.ok(v);assert.equal(v.informationState,"researched_unknown");assert.equal(v.valueText,null);assert.deepEqual(v.valueTextList,[]);assert.equal(v.valueNumber,null);assert.equal(v.valueBoolean,null);assert.equal(v.confidence,null);assert.deepEqual(v.sources.supporting,[]);} }
assert.ok(fallback.includes("issue288NorthDetails"),"later re-research may supersede Issue #253 runtime values for the northern three ports");
assert.match(migration,/on conflict \(id\) do nothing/); assert.doesNotMatch(migration,/delete\s+from|drop\s+(table|column)|update\s+/i); for(const id of ["hirado-seto","hirado-port","tabira-port"]){assert.ok(fishingSpots.some(s=>s.id===id));assert.doesNotMatch(migration,new RegExp(`update[^;]+${id}`,"i"));}
for(const sid of Object.keys(audit.sources)){assert.ok(before.every(x=>!x.includes(sid))); assert.ok(!Object.keys(audit.sources).some((other)=>other!==sid&&uuid(other)===uuid(sid)));}
assert.ok(audit.heldOrExcluded.some((x)=>x.name==="平戸港"&&x.decision==="exclude")); assert.ok(audit.migrationPolicy.some((x:string)=>x.includes("再割当しない")));
console.log("Issue #253 Hirado main-island spot tests passed");
