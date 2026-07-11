import { readFileSync } from "node:fs";

const hookSource = readFileSync("src/hooks/useExternalCatchMemos.ts", "utf8");
const repositorySource = readFileSync("src/lib/externalCatchMemoRepository.ts", "utf8");

const memo = (id, label) => ({ id, label });

function modelState({ dbMemos = [], localMemos = [], deletedDbMemoIds = [], localOwnerById = {}, userId = "user-1", dbReadOk = true } = {}) {
  const scopedLocalMemos = localMemos.filter((item) => !localOwnerById[item.id] || localOwnerById[item.id] === userId);
  const existingDbIds = new Set(dbMemos.map((item) => item.id));
  const deletedIds = new Set(deletedDbMemoIds.filter((id) => existingDbIds.has(id)));
  const localIds = new Set(scopedLocalMemos.map((item) => item.id));
  const visibleDbMemos = dbReadOk ? dbMemos.filter((item) => !deletedIds.has(item.id)) : [];
  const visibleMemos = [...scopedLocalMemos, ...visibleDbMemos.filter((item) => !localIds.has(item.id))];
  return {
    visibleMemos,
    localMemos: scopedLocalMemos,
    localIds,
    dbIds: new Set(visibleDbMemos.map((item) => item.id)),
    deletedIds,
    dbAvailable: dbReadOk,
    status: dbReadOk && scopedLocalMemos.length === 0 && deletedIds.size === 0 ? { source: "supabase" } : { source: "local-storage-fallback", fallbackReason: dbReadOk ? "local-data-not-migrated" : "supabase-error" },
  };
}

function saveMemo(state, nextMemo, { dbWriteFails = false, userId = "user-1" } = {}) {
  const isExistingDbMemo = state.dbIds.has(nextMemo.id) && !state.localIds.has(nextMemo.id);
  const shouldUseDb = state.dbAvailable && (isExistingDbMemo || state.status.source === "supabase");
  const visibleMemos = state.visibleMemos.some((item) => item.id === nextMemo.id)
    ? state.visibleMemos.map((item) => (item.id === nextMemo.id ? nextMemo : item))
    : [nextMemo, ...state.visibleMemos];

  if (!shouldUseDb || dbWriteFails) {
    const nextLocalIds = new Set(state.localIds);
    nextLocalIds.add(nextMemo.id);
    return {
      visibleMemos,
      localMemos: visibleMemos.filter((item) => nextLocalIds.has(item.id)),
      localIds: nextLocalIds,
      dbIds: state.dbIds,
      dbUpdated: false,
      dbInserted: false,
      localOwnerById: { [nextMemo.id]: userId },
      deletedIds: state.deletedIds,
      status: { source: "local-storage-fallback", fallbackReason: dbWriteFails ? "supabase-error" : state.status.fallbackReason },
    };
  }

  return {
    ...state,
    visibleMemos,
    dbUpdated: isExistingDbMemo,
    dbInserted: !isExistingDbMemo,
    status: state.localIds.size > 0 || state.deletedIds.size > 0 ? { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated" } : { source: "supabase" },
  };
}

function deleteMemo(state, memoId, { dbDeleteFails = false, targetExists = true, ownerMatches = true } = {}) {
  const canFindOwnedActiveRow = state.dbIds.has(memoId) && targetExists && ownerMatches;
  const shouldUseDb = state.dbAvailable && canFindOwnedActiveRow && !state.localIds.has(memoId);
  const nextLocalIds = new Set(state.localIds);
  const nextDeletedIds = new Set(state.deletedIds);
  nextLocalIds.delete(memoId);
  if (state.dbIds.has(memoId) && (!shouldUseDb || dbDeleteFails)) nextDeletedIds.add(memoId);
  return {
    visibleMemos: state.visibleMemos.filter((item) => item.id !== memoId),
    localMemos: state.visibleMemos.filter((item) => nextLocalIds.has(item.id) && item.id !== memoId),
    localIds: nextLocalIds,
    dbIds: shouldUseDb && !dbDeleteFails ? new Set([...state.dbIds].filter((id) => id !== memoId)) : state.dbIds,
    deletedIds: nextDeletedIds,
    dbDeleted: shouldUseDb && !dbDeleteFails,
    status: nextLocalIds.size > 0 || nextDeletedIds.size > 0 ? { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated" } : { source: "supabase" },
  };
}

function assert(condition, label) {
  if (!condition) throw new Error(label);
  console.log(`ok: ${label}`);
}


// Repository delete success is based on pre-delete owner-scoped active-row existence plus exact update count, not RETURNING the deleted row.
{
  const initial = modelState({ dbMemos: [memo("a", "db A")] });
  const afterDelete = deleteMemo(initial, "a");
  assert(afterDelete.dbDeleted === true, "owner target row exists -> DB logical delete succeeds");
  assert(afterDelete.deletedIds.size === 0 && afterDelete.status.source === "supabase", "DB delete success does not create a local tombstone and keeps Supabase status");
  const afterReload = modelState({ dbMemos: [], localMemos: afterDelete.localMemos, deletedDbMemoIds: [...afterDelete.deletedIds] });
  assert(afterReload.visibleMemos.length === 0, "after reload a successfully deleted DB memo remains hidden without a tombstone");
}

{
  const initial = modelState({ dbMemos: [memo("a", "db A")] });
  const missingTarget = deleteMemo(initial, "a", { targetExists: false });
  assert(missingTarget.dbDeleted === false && missingTarget.deletedIds.has("a"), "target row 0件 -> not treated as DB success and uses local tombstone fallback");
  const otherOwner = deleteMemo(initial, "a", { ownerMatches: false });
  assert(otherOwner.dbDeleted === false && otherOwner.deletedIds.has("a"), "another user's row -> not treated as DB success and uses local tombstone fallback");
  const dbError = deleteMemo(initial, "a", { dbDeleteFails: true });
  assert(dbError.dbDeleted === false && dbError.deletedIds.has("a"), "DB error -> local tombstone fallback");
}

// DB=[A], localStorage=[B] -> edit DB-origin A -> DB update, local B remains local only.
{
  const initial = modelState({ dbMemos: [memo("a", "db A")], localMemos: [memo("b", "local B")] });
  const afterEdit = saveMemo(initial, memo("a", "db A edited"));
  assert(afterEdit.dbUpdated === true, "coexisting DB-origin memo edit calls DB update despite fallback display status");
  assert(afterEdit.localMemos.map((item) => item.id).join(",") === "b", "DB-origin edit does not copy DB memo into localStorage and keeps local B local");
}

// DB=[A], localStorage=[B] -> delete DB-origin A -> DB logical delete, reload DB=[] -> A remains absent.
{
  const initial = modelState({ dbMemos: [memo("a", "db A")], localMemos: [memo("b", "local B")] });
  const afterDelete = deleteMemo(initial, "a");
  const afterReload = modelState({ dbMemos: [], localMemos: afterDelete.localMemos, deletedDbMemoIds: [...afterDelete.deletedIds] });
  assert(afterDelete.dbDeleted === true, "coexisting DB-origin memo delete calls DB logical delete despite fallback display status");
  assert(afterReload.visibleMemos.map((item) => item.id).join(",") === "b", "DB-origin delete remains absent after reload when DB row is logically deleted");
}

// DB operation failure -> only target A becomes user-scoped local shadow/tombstone; local B and other users remain separated.
{
  const initial = modelState({ dbMemos: [memo("a", "db A")], localMemos: [memo("b", "local B")] });
  const afterFailedEdit = saveMemo(initial, memo("a", "db A local shadow"), { dbWriteFails: true, userId: "user-1" });
  assert(new Set(afterFailedEdit.localMemos.map((item) => item.id)).size === 2 && afterFailedEdit.localMemos.some((item) => item.id === "a") && afterFailedEdit.localMemos.some((item) => item.id === "b"), "failed DB edit falls back with only target DB memo shadow plus existing local memo");
  const user2State = modelState({ dbMemos: [], localMemos: afterFailedEdit.localMemos, localOwnerById: afterFailedEdit.localOwnerById, userId: "user-2" });
  assert(user2State.visibleMemos.map((item) => item.id).join(",") === "b", "user-scoped failed DB shadow is not mixed into another user view");
  const afterFailedDelete = deleteMemo(initial, "a", { dbDeleteFails: true });
  assert(afterFailedDelete.deletedIds.has("a") && afterFailedDelete.localMemos.map((item) => item.id).join(",") === "b", "failed DB delete records a tombstone for A without mixing local B");
}

// Tombstone target no longer exists in successful DB read -> prune tombstone and keep DB-origin CRUD enabled.
{
  const afterReload = modelState({ dbMemos: [memo("c", "db C")], localMemos: [], deletedDbMemoIds: ["a"] });
  assert(afterReload.deletedIds.size === 0 && afterReload.status.source === "supabase", "stale tombstone is pruned after successful DB read when target row no longer exists");
  const afterEdit = saveMemo(afterReload, memo("c", "db C edited"));
  assert(afterEdit.dbUpdated === true, "DB-origin CRUD continues after stale tombstone cleanup");
}

// DB=[A], localStorage=[B] -> edit B/add C -> localStorage never receives DB-origin A.
{
  const initial = modelState({ dbMemos: [memo("a", "db A")], localMemos: [memo("b", "local B")] });
  const afterEdit = saveMemo(initial, memo("b", "local B edited"));
  const afterAdd = saveMemo(afterEdit, memo("c", "local C"));
  assert(afterAdd.localMemos.map((item) => item.id).join(",") === "c,b", "local CRUD stores only local-origin/fallback memos and does not copy DB-origin rows");
}

// DB/localStorage duplicate A -> delete local A -> reload DB=[A], tombstone=[A] -> DB A does not unexpectedly reappear.
{
  const dbA = memo("a", "db A");
  const localA = memo("a", "local A wins");
  const initial = modelState({ dbMemos: [dbA], localMemos: [localA] });
  assert(initial.visibleMemos.length === 1 && initial.visibleMemos[0].label === "local A wins", "duplicate ID initially displays once with localStorage precedence");
  const afterDelete = deleteMemo(initial, "a");
  const afterReload = modelState({ dbMemos: [dbA], localMemos: afterDelete.localMemos, deletedDbMemoIds: [...afterDelete.deletedIds] });
  assert(afterReload.visibleMemos.length === 0, "deleting local duplicate tombstones DB duplicate so it does not reappear");
}

assert(/dbAvailableRef = useRef\(false\)/.test(hookSource), "hook tracks successful Supabase read availability separately from display status");
assert(/canUseDb\(authStatus, userId, dbAvailableRef\.current\)/.test(hookSource), "hook does not require status.source === supabase for DB-origin CRUD");
assert(/isExistingDbMemo \|\| status\.source === "supabase"/.test(hookSource), "hook routes existing DB-origin memos to DB while keeping coexistence new memos local");
assert(/pruneDeletedDbMemoIds/.test(hookSource), "hook prunes tombstones that no longer match successful DB read rows");
assert(/deletedDbMemoIdsByUserId/.test(hookSource), "hook stores DB delete tombstones by user");
assert(/ownerIdByMemoId/.test(hookSource), "hook stores local fallback ownership by memo ID");
assert(/saveLocalOriginMemos/.test(hookSource), "hook saves only local-origin/fallback memos to localStorage");
assert(/if \(!data\) return fallback\(null, "supabase-error", "No matching external catch memo row was updated\."\)/.test(repositorySource), "repository treats zero-row DB update as fallback");
assert(/select\("id"\)[\s\S]*eq\("is_deleted", false\)[\s\S]*maybeSingle\(\)/.test(repositorySource), "repository verifies owner-scoped active row before logical delete");
assert(/update\(\{ is_deleted: true, updated_at: new Date\(\)\.toISOString\(\) \}, \{ count: "exact" \}\)/.test(repositorySource), "repository requests exact update count without selecting deleted row");
assert(/if \(count !== 1\) return fallback\(null, "supabase-error", "No matching external catch memo row was deleted\."\)/.test(repositorySource), "repository treats zero-row DB delete update as fallback");
assert(!/update\(\{ is_deleted: true[\s\S]*?\.select\("id"\)/.test(repositorySource), "repository does not rely on RETURNING SELECT for deleted row success");

console.log("External memo state transition scenarios passed without DB/network access.");
