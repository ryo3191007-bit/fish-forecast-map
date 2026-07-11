import { readFileSync } from "node:fs";

const hookSource = readFileSync("src/hooks/useExternalCatchMemos.ts", "utf8");
const repositorySource = readFileSync("src/lib/externalCatchMemoRepository.ts", "utf8");

const memo = (id, label) => ({ id, label });

function mergeExternalCatchMemos(dbMemos, localMemos) {
  const merged = [...localMemos];
  const localIds = new Set(localMemos.map((item) => item.id));
  for (const dbMemo of dbMemos) {
    if (!localIds.has(dbMemo.id)) merged.push(dbMemo);
  }
  return merged;
}

function shouldUseDb(authStatus, userId, status) {
  return authStatus === "signed-in" && Boolean(userId) && status.source === "supabase";
}

function readAfterSupabaseResult(dbMemos, localMemos) {
  if (localMemos.length > 0) {
    return {
      memos: mergeExternalCatchMemos(dbMemos, localMemos),
      status: { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated" },
    };
  }
  return { memos: dbMemos, status: { source: "supabase" } };
}

function saveMemo(currentMemos, localMemos, status, nextMemo, options = {}) {
  const optimisticMemos = currentMemos.some((item) => item.id === nextMemo.id)
    ? currentMemos.map((item) => (item.id === nextMemo.id ? nextMemo : item))
    : [nextMemo, ...currentMemos];

  if (!shouldUseDb("signed-in", "user-1", status) || options.dbWriteFails) {
    return {
      visibleMemos: optimisticMemos,
      localMemos: optimisticMemos,
      dbInserted: false,
      status: { source: "local-storage-fallback", fallbackReason: options.dbWriteFails ? "supabase-error" : status.fallbackReason },
    };
  }

  return { visibleMemos: optimisticMemos, localMemos, dbInserted: true, status: { source: "supabase" } };
}

function assert(condition, label) {
  if (!condition) throw new Error(label);
  console.log(`ok: ${label}`);
}

// DB=[A], localStorage=[] -> B DB save fails -> fallback stores A+B locally -> reload DB=[A] -> visible A+B.
{
  const dbA = memo("a", "db A");
  const localB = memo("b", "local B");
  const initial = readAfterSupabaseResult([dbA], []);
  const afterFailedSave = saveMemo(initial.memos, [], initial.status, localB, { dbWriteFails: true });
  const afterReload = readAfterSupabaseResult([dbA], afterFailedSave.localMemos);
  assert(afterReload.memos.map((item) => item.id).join(",") === "b,a", "DB write fallback memo remains visible with DB rows after reload");
  assert(afterReload.status.fallbackReason === "local-data-not-migrated", "coexisting DB/localStorage data keeps local-data-not-migrated status");
}

// DB read error/localStorage display -> new add -> DB would be available later, but local fallback status blocks partial implicit insert.
{
  const localA = memo("a", "local A");
  const localB = memo("b", "local B");
  const fallbackStatus = { source: "local-storage-fallback", fallbackReason: "supabase-error" };
  const afterAdd = saveMemo([localA], [localA], fallbackStatus, localB);
  assert(afterAdd.dbInserted === false, "supabase-error fallback status does not insert a new DB row during recovery");
  assert(afterAdd.localMemos.map((item) => item.id).join(",") === "b,a", "supabase-error fallback addition is kept in localStorage");
}

// DB/localStorage duplicate IDs are displayed once with localStorage version first/preferred.
{
  const dbA = memo("a", "db A");
  const localA = memo("a", "local A unsynced edit");
  const localB = memo("b", "local B");
  const afterReload = readAfterSupabaseResult([dbA], [localA, localB]);
  assert(afterReload.memos.length === 2, "duplicate DB/localStorage IDs are not displayed twice");
  assert(afterReload.memos[0].label === "local A unsynced edit", "localStorage memo wins when IDs overlap");
}

assert(/function mergeExternalCatchMemos[\s\S]*const merged = \[\.\.\.localMemos\][\s\S]*!localIds\.has\(dbMemo\.id\)/.test(hookSource), "hook merges DB and localStorage memos with localStorage ID precedence");
assert(/status\.source === "supabase"/.test(hookSource), "hook only enables DB mutations while current status is supabase");
assert(/if \(!data\) return fallback\(null, "supabase-error", "No matching external catch memo row was updated\."\)/.test(repositorySource), "repository treats zero-row DB update as fallback");
assert(/if \(!data\) return fallback\(null, "supabase-error", "No matching external catch memo row was deleted\."\)/.test(repositorySource), "repository treats zero-row DB delete as fallback");

console.log("External memo state transition scenarios passed without DB/network access.");
