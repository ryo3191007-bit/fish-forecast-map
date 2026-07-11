import { readFileSync } from "node:fs";

const hookSource = readFileSync("src/hooks/useExternalCatchMemos.ts", "utf8");
const repositorySource = readFileSync("src/lib/externalCatchMemoRepository.ts", "utf8");
const hardenedRpcSql = readFileSync("supabase/sql/007_harden_soft_delete_external_catch_memo_rpc.sql", "utf8");

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
    status: dbReadOk && scopedLocalMemos.length === 0 && deletedIds.size === 0
      ? { source: "supabase", isDbAvailable: true }
      : { source: "local-storage-fallback", fallbackReason: dbReadOk ? "local-data-not-migrated" : "supabase-error", isDbAvailable: dbReadOk },
  };
}

function saveMemo(state, nextMemo, { dbWriteFails = false, userId = "user-1" } = {}) {
  const isExistingDbMemo = state.dbIds.has(nextMemo.id) && !state.localIds.has(nextMemo.id);
  const shouldUseDb = state.dbAvailable && !state.localIds.has(nextMemo.id);
  const visibleMemos = state.visibleMemos.some((item) => item.id === nextMemo.id)
    ? state.visibleMemos.map((item) => (item.id === nextMemo.id ? nextMemo : item))
    : [nextMemo, ...state.visibleMemos];

  if (!shouldUseDb || dbWriteFails) {
    const nextLocalIds = new Set(state.localIds);
    nextLocalIds.add(nextMemo.id);
    return {
      ...state,
      visibleMemos,
      localMemos: visibleMemos.filter((item) => nextLocalIds.has(item.id)),
      localIds: nextLocalIds,
      dbUpdated: false,
      dbInserted: false,
      localOwnerById: { ...state.localOwnerById, [nextMemo.id]: userId },
      status: {
        source: "local-storage-fallback",
        fallbackReason: dbWriteFails ? "supabase-error" : state.status.fallbackReason,
        isDbAvailable: state.dbAvailable,
      },
    };
  }

  return {
    ...state,
    visibleMemos,
    dbUpdated: isExistingDbMemo,
    dbInserted: !isExistingDbMemo,
    status: state.localIds.size > 0 || state.deletedIds.size > 0
      ? { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated", isDbAvailable: state.dbAvailable }
      : { source: "supabase", isDbAvailable: state.dbAvailable },
  };
}


function migrateLocalMemos(state, selectedIds, { dbSaveFailures = [], verificationFailures = [], concurrentLocalMemos = [], localStorageWriteFails = false, userId = "user-1", authOk = true } = {}) {
  const result = { succeeded: [], skipped: [], failed: [] };
  if (!authOk || !state.dbAvailable) {
    selectedIds.forEach((id) => result.skipped.push({ id, reason: "not-local-origin" }));
    return { ...state, migrationResult: result };
  }
  const dbIds = new Set(state.dbIds);
  const succeededIds = new Set();
  for (const id of selectedIds) {
    if (!state.localIds.has(id)) { result.skipped.push({ id, reason: "not-local-origin" }); continue; }
    if (dbIds.has(id)) { result.skipped.push({ id, reason: "duplicate-id" }); continue; }
    if (dbSaveFailures.includes(id)) { result.failed.push({ id, reason: "save-failed" }); continue; }
    if (verificationFailures.includes(id)) { result.failed.push({ id, reason: "verification-failed" }); dbIds.add(id); continue; }
    result.succeeded.push(id);
    succeededIds.add(id);
    dbIds.add(id);
  }
  const latestLocalMemos = [...state.localMemos, ...concurrentLocalMemos];
  if (localStorageWriteFails) {
    return {
      ...state,
      dbIds,
      localMemos: latestLocalMemos,
      visibleMemos: [...state.visibleMemos, ...concurrentLocalMemos],
      migrationResult: { ...result, failed: [...result.failed, ...result.succeeded.map((id) => ({ id, reason: "verification-failed" }))], succeeded: [] },
      isMutating: false,
      storageError: "cleanup-failed",
      status: { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated", isDbAvailable: true },
    };
  }
  const nextLocalIds = new Set([...state.localIds, ...concurrentLocalMemos.map((item) => item.id)].filter((id) => !succeededIds.has(id)));
  const nextLocalMemos = latestLocalMemos.filter((item) => !succeededIds.has(item.id));
  return {
    ...state,
    localIds: nextLocalIds,
    dbIds,
    localMemos: nextLocalMemos,
    visibleMemos: [...state.visibleMemos.filter((item) => !succeededIds.has(item.id)), ...concurrentLocalMemos.filter((item) => !state.visibleMemos.some((visible) => visible.id === item.id))],
    migrationResult: result,
    isMutating: false,
    localOwnerById: Object.fromEntries(Object.entries(state.localOwnerById ?? {}).filter(([id, owner]) => !succeededIds.has(id) || owner !== userId)),
    status: nextLocalIds.size > 0 ? { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated", isDbAvailable: true } : { source: "supabase", isDbAvailable: true },
  };
}

function deleteMemo(state, memoId, { rpcError = false, rpcReturnsTrue = true, targetExists = true, ownerMatches = true, alreadyDeleted = false } = {}) {
  const rpcCanDelete = state.dbIds.has(memoId) && targetExists && ownerMatches && !alreadyDeleted && rpcReturnsTrue;
  const shouldUseDb = state.dbAvailable && !state.localIds.has(memoId);
  const nextLocalIds = new Set(state.localIds);
  const nextDeletedIds = new Set(state.deletedIds);
  nextLocalIds.delete(memoId);
  if (state.dbIds.has(memoId) && (!shouldUseDb || rpcError || !rpcCanDelete)) nextDeletedIds.add(memoId);
  return {
    ...state,
    visibleMemos: state.visibleMemos.filter((item) => item.id !== memoId),
    localMemos: state.visibleMemos.filter((item) => nextLocalIds.has(item.id) && item.id !== memoId),
    localIds: nextLocalIds,
    dbIds: shouldUseDb && !rpcError && rpcCanDelete ? new Set([...state.dbIds].filter((id) => id !== memoId)) : state.dbIds,
    deletedIds: nextDeletedIds,
    dbDeleted: shouldUseDb && !rpcError && rpcCanDelete,
    status: nextLocalIds.size > 0 || nextDeletedIds.size > 0
      ? { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated", isDbAvailable: state.dbAvailable }
      : { source: "supabase", isDbAvailable: state.dbAvailable },
  };
}

function assert(condition, label) {
  if (!condition) throw new Error(label);
  console.log(`ok: ${label}`);
}



// Explicit migration: DB available + selected local memo -> save, verify, then remove only that local memo.
{
  const initial = modelState({ dbMemos: [memo("a", "db A")], localMemos: [memo("b", "local B"), memo("c", "local C")] });
  const afterMigration = migrateLocalMemos(initial, ["b"]);
  assert(afterMigration.migrationResult.succeeded.join(",") === "b", "migration succeeds for selected localStorage-origin memo after DB verification");
  assert(afterMigration.localMemos.map((item) => item.id).join(",") === "c", "migration removes only verified successful local target and leaves unselected local memo");
  const afterReload = modelState({ dbMemos: [memo("a", "db A"), memo("b", "db B")], localMemos: afterMigration.localMemos });
  assert(afterReload.visibleMemos.map((item) => item.id).join(",") === "c,a,b", "migrated memo reloads from DB without local duplicate while unmigrated memo remains local");
}

// Failed save or failed verification never deletes localStorage-origin data.
{
  const initial = modelState({ dbMemos: [], localMemos: [memo("b", "local B"), memo("c", "local C")] });
  const afterFailure = migrateLocalMemos(initial, ["b", "c"], { dbSaveFailures: ["b"], verificationFailures: ["c"] });
  assert(afterFailure.migrationResult.failed.length === 2, "migration reports DB save and verification failures");
  assert(afterFailure.localMemos.map((item) => item.id).join(",") === "b,c", "failed or unverified migration keeps localStorage data");
}

// Duplicate DB ID and unavailable auth/DB states are skipped, not overwritten or deleted.
{
  const duplicate = modelState({ dbMemos: [memo("a", "db A")], localMemos: [memo("a", "local A"), memo("b", "local B")] });
  const afterDuplicate = migrateLocalMemos(duplicate, ["a", "b"], { dbSaveFailures: ["b"] });
  assert(afterDuplicate.migrationResult.skipped.some((item) => item.id === "a" && item.reason === "duplicate-id"), "migration skips same-ID DB row instead of unconditional overwrite");
  assert(afterDuplicate.localMemos.some((item) => item.id === "a") && afterDuplicate.localMemos.some((item) => item.id === "b"), "duplicate and failed items remain in localStorage");
  const unavailable = migrateLocalMemos(modelState({ dbMemos: [], localMemos: [memo("b", "local B")], dbReadOk: false }), ["b"]);
  assert(unavailable.migrationResult.succeeded.length === 0 && unavailable.localMemos.map((item) => item.id).join(",") === "b", "DB unavailable migration is not performed and local memo remains");
}

// User-scoped fallback memo for another user is not a migration candidate in this user's state.
{
  const initial = modelState({ dbMemos: [], localMemos: [memo("mine", "mine"), memo("other", "other")], localOwnerById: { other: "user-2" }, userId: "user-1" });
  const afterMigration = migrateLocalMemos(initial, ["mine", "other"]);
  assert(afterMigration.migrationResult.skipped.some((item) => item.id === "other"), "another user's fallback is not mixed into migration targets");
  assert(afterMigration.localMemos.map((item) => item.id).join(",") === "", "current user's verified migration can complete without touching other user's fallback storage");
}


// Migration cleanup re-reads current localStorage and removes only verified succeeded IDs.
{
  const initial = modelState({ dbMemos: [], localMemos: [memo("b", "local B"), memo("c", "local C")] });
  const afterMigration = migrateLocalMemos(initial, ["b"], { concurrentLocalMemos: [memo("d", "added in another tab")] });
  assert(afterMigration.migrationResult.succeeded.join(",") === "b", "migration succeeds for selected memo while another tab adds local data");
  assert(afterMigration.localMemos.map((item) => item.id).join(",") === "c,d", "migration cleanup keeps unselected and concurrently added localStorage memos");
}

// localStorage cleanup write failure keeps local data and clears mutating state without throwing.
{
  const initial = modelState({ dbMemos: [], localMemos: [memo("b", "local B"), memo("c", "local C")] });
  const afterFailure = migrateLocalMemos(initial, ["b"], { localStorageWriteFails: true });
  assert(afterFailure.migrationResult.succeeded.length === 0 && afterFailure.migrationResult.failed.some((item) => item.id === "b"), "localStorage cleanup write failure converts verified success to safe failure result");
  assert(afterFailure.localMemos.map((item) => item.id).join(",") === "b,c", "localStorage cleanup write failure keeps existing local memos");
  assert(afterFailure.isMutating === false, "localStorage cleanup write failure clears processing state");
}

// Repository delete success is based on the owner-scoped RPC returning data === true, not RETURNING the deleted row.
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
  const alreadyDeleted = deleteMemo(initial, "a", { alreadyDeleted: true });
  assert(alreadyDeleted.dbDeleted === false && alreadyDeleted.deletedIds.has("a"), "already deleted row -> not treated as DB success and uses local tombstone fallback");
  const falseResult = deleteMemo(initial, "a", { rpcReturnsTrue: false });
  assert(falseResult.dbDeleted === false && falseResult.deletedIds.has("a"), "RPC false -> local tombstone fallback");
  const dbError = deleteMemo(initial, "a", { rpcError: true });
  assert(dbError.dbDeleted === false && dbError.deletedIds.has("a"), "RPC error -> local tombstone fallback");
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

// DB available + localStorage memo/tombstone coexistence -> new memo still goes to DB insert.
{
  const withLocal = modelState({ dbMemos: [memo("a", "db A")], localMemos: [memo("b", "local B")] });
  const afterAdd = saveMemo(withLocal, memo("c", "new C"));
  assert(afterAdd.dbInserted === true, "DB available with localStorage memo -> new memo calls DB insert");
  assert(afterAdd.localMemos.map((item) => item.id).join(",") === "b", "DB-inserted new memo is not auto-migrated into localStorage");

  const withTombstone = modelState({ dbMemos: [memo("a", "db A")], deletedDbMemoIds: ["a"] });
  const afterTombstoneAdd = saveMemo(withTombstone, memo("c", "new C"));
  assert(afterTombstoneAdd.dbInserted === true, "DB available with tombstone -> new memo calls DB insert");
}

// localStorage-origin CRUD stays local even when DB is available.
{
  const initial = modelState({ dbMemos: [memo("a", "db A")], localMemos: [memo("b", "local B")] });
  const afterEditLocal = saveMemo(initial, memo("b", "local B edited"));
  assert(afterEditLocal.dbUpdated === false && afterEditLocal.dbInserted === false, "localStorage-origin edit updates localStorage only");
  assert(afterEditLocal.localMemos.map((item) => item.id).join(",") === "b", "localStorage-origin edit keeps only local memo in localStorage");
  const afterDeleteLocal = deleteMemo(initial, "b");
  assert(afterDeleteLocal.dbDeleted === false && afterDeleteLocal.localMemos.length === 0, "localStorage-origin delete deletes localStorage only");
}

// DB insert failure -> new memo falls back to user-scoped localStorage.
{
  const initial = modelState({ dbMemos: [memo("a", "db A")], localMemos: [memo("b", "local B")] });
  const afterFailedInsert = saveMemo(initial, memo("c", "new C local fallback"), { dbWriteFails: true, userId: "user-1" });
  assert(afterFailedInsert.dbInserted === false && afterFailedInsert.localMemos.some((item) => item.id === "c"), "DB insert failure stores new memo as local fallback");
  const user2State = modelState({ dbMemos: [], localMemos: afterFailedInsert.localMemos, localOwnerById: afterFailedInsert.localOwnerById, userId: "user-2" });
  assert(user2State.visibleMemos.map((item) => item.id).join(",") === "b", "user-scoped new fallback memo is not mixed into another user view");
}

// DB operation failure -> only target A becomes user-scoped local shadow/tombstone; local B and other users remain separated.
{
  const initial = modelState({ dbMemos: [memo("a", "db A")], localMemos: [memo("b", "local B")] });
  const afterFailedEdit = saveMemo(initial, memo("a", "db A local shadow"), { dbWriteFails: true, userId: "user-1" });
  assert(new Set(afterFailedEdit.localMemos.map((item) => item.id)).size === 2 && afterFailedEdit.localMemos.some((item) => item.id === "a") && afterFailedEdit.localMemos.some((item) => item.id === "b"), "failed DB edit falls back with only target DB memo shadow plus existing local memo");
  const user2State = modelState({ dbMemos: [], localMemos: afterFailedEdit.localMemos, localOwnerById: afterFailedEdit.localOwnerById, userId: "user-2" });
  assert(user2State.visibleMemos.map((item) => item.id).join(",") === "b", "user-scoped failed DB shadow is not mixed into another user view");
  const afterFailedDelete = deleteMemo(initial, "a", { rpcError: true });
  assert(afterFailedDelete.deletedIds.has("a") && afterFailedDelete.localMemos.map((item) => item.id).join(",") === "b", "failed DB delete records a tombstone for A without mixing local B");
}

// Tombstone target no longer exists in successful DB read -> prune tombstone and keep DB-origin CRUD enabled.
{
  const afterReload = modelState({ dbMemos: [memo("c", "db C")], localMemos: [], deletedDbMemoIds: ["a"] });
  assert(afterReload.deletedIds.size === 0 && afterReload.status.source === "supabase", "stale tombstone is pruned after successful DB read when target row no longer exists");
  const afterEdit = saveMemo(afterReload, memo("c", "db C edited"));
  assert(afterEdit.dbUpdated === true, "DB-origin CRUD continues after stale tombstone cleanup");
}

// DB=[A], localStorage=[B] -> edit B/add C -> edit B stays local, new C inserts into DB, and localStorage never receives DB-origin A.
{
  const initial = modelState({ dbMemos: [memo("a", "db A")], localMemos: [memo("b", "local B")] });
  const afterEdit = saveMemo(initial, memo("b", "local B edited"));
  const afterAdd = saveMemo(afterEdit, memo("c", "new C"));
  assert(afterEdit.status.isDbAvailable === true, "localStorage-origin edit preserves DB availability in status");
  assert(afterAdd.dbInserted === true, "after localStorage-origin edit, new memo still calls DB insert");
  assert(afterAdd.localMemos.map((item) => item.id).join(",") === "b", "local CRUD stores only local-origin/fallback memos and does not copy DB-origin rows");
  assert(afterAdd.localMemos[0].label === "local B edited", "localStorage-origin edit remains saved locally after later DB insert");
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


assert(/migrateLocalMemosToSupabase/.test(hookSource), "hook exposes explicit localStorage migration action");
assert(/saveExternalCatchMemoToSupabase\(mutationUserId, memo, \{ mode: "insert" \}\)/.test(hookSource), "migration inserts selected local memos one by one without update/upsert overwrite");
assert(/fetchExternalCatchMemosFromSupabase\(mutationUserId\)/.test(hookSource), "migration verifies DB refetch before local removal");
assert(/removeSucceededLocalOriginMemos\(succeededIds, mutationUserId\)/.test(hookSource), "migration re-reads localStorage cleanup and removes only verified succeeded IDs");
assert(/finally \{[\s\S]*setStatus\(\(current\) => \(\{ \.\.\.current, isMutating: false \}\)\)/.test(hookSource), "migration clears mutating state in finally");
assert(/dbAvailableRef = useRef\(false\)/.test(hookSource), "hook tracks successful Supabase read availability separately from display status");
assert(/isDbAvailable: true/.test(hookSource), "hook exposes DB availability separately from local fallback display status");
assert(/canUseDb\(authStatus, userId, dbAvailableRef\.current\)/.test(hookSource), "hook does not require status.source === supabase for DB CRUD availability");
assert(/const shouldPersistToDb = useDb && Boolean\(mutationUserId\) && !localMemoIdsRef\.current\.has\(memo\.id\)/.test(hookSource), "hook routes new and DB-origin memos to DB when DB is available, while local-origin memo edits stay local");
assert(/pruneDeletedDbMemoIds/.test(hookSource), "hook prunes tombstones that no longer match successful DB read rows");
assert(/deletedDbMemoIdsByUserId/.test(hookSource), "hook stores DB delete tombstones by user");
assert(/ownerIdByMemoId/.test(hookSource), "hook stores local fallback ownership by memo ID");
assert(/saveLocalOriginMemos/.test(hookSource), "hook saves only local-origin/fallback memos to localStorage");
assert(/if \(!data\) return fallback\(null, "supabase-error", "No matching external catch memo row was updated\."\)/.test(repositorySource), "repository treats zero-row DB update as fallback");
assert(/\.rpc\("soft_delete_external_catch_memo", \{ p_memo_id: memoId \}\)/.test(repositorySource), "repository calls soft delete RPC");
assert(/if \(data !== true\)/.test(repositorySource), "repository treats non-true RPC delete result as fallback");
assert(!/NODE_ENV\s*={2,3}\s*["']production/.test(repositorySource), "repository does not disable safe diagnostics in production");
assert(/console\.warn/.test(repositorySource) && /sanitizeDiagnosticMessage/.test(repositorySource), "repository logs only sanitized short diagnostics");
assert(!/update\(\{ is_deleted: true[\s\S]*?\.select\("id"\)/.test(repositorySource), "repository does not rely on RETURNING SELECT for deleted row success");
assert(/security definer/i.test(hardenedRpcSql), "hardened RPC uses security definer");
assert(/set search_path = ''/i.test(hardenedRpcSql), "hardened RPC uses empty search_path");
assert(/caller_id uuid := auth\.uid\(\);[\s\S]*if caller_id is null then[\s\S]*return false;/i.test(hardenedRpcSql), "hardened RPC returns false when auth uid is null");
assert(/update public\.external_catch_memos[\s\S]*id = p_memo_id[\s\S]*owner_id = caller_id[\s\S]*created_by = 'authenticated_user'[\s\S]*is_deleted = false/.test(hardenedRpcSql), "hardened RPC updates only owner-scoped authenticated_user active rows");
assert(/updated_at = pg_catalog\.now\(\)/.test(hardenedRpcSql), "hardened RPC fully qualifies timestamp function");
assert(/return updated_count = 1;/.test(hardenedRpcSql), "hardened RPC only returns true for one updated row");
assert(/revoke all[\s\S]*from public;[\s\S]*revoke all[\s\S]*from anon;[\s\S]*grant execute[\s\S]*to authenticated;/i.test(hardenedRpcSql), "hardened RPC grants execute to authenticated only");

console.log("External memo state transition scenarios passed without DB/network access.");
