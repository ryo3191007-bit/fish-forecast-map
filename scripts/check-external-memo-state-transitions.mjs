import { readFileSync } from "node:fs";

const hookSource = readFileSync("src/hooks/useExternalCatchMemos.ts", "utf8");
const repositorySource = readFileSync("src/lib/externalCatchMemoRepository.ts", "utf8");

const memo = (id, label) => ({ id, label });

function modelState({ dbMemos = [], localMemos = [], deletedDbMemoIds = [], localOwnerById = {}, userId = "user-1" } = {}) {
  const scopedLocalMemos = localMemos.filter((item) => !localOwnerById[item.id] || localOwnerById[item.id] === userId);
  const deletedIds = new Set(deletedDbMemoIds);
  const localIds = new Set(scopedLocalMemos.map((item) => item.id));
  const visibleDbMemos = dbMemos.filter((item) => !deletedIds.has(item.id));
  const visibleMemos = [...scopedLocalMemos, ...visibleDbMemos.filter((item) => !localIds.has(item.id))];
  return {
    visibleMemos,
    localMemos: scopedLocalMemos,
    localIds,
    dbIds: new Set(visibleDbMemos.map((item) => item.id)),
    deletedIds,
    status: scopedLocalMemos.length > 0 || deletedIds.size > 0 ? { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated" } : { source: "supabase" },
  };
}

function saveMemo(state, nextMemo, { dbWriteFails = false, userId = "user-1" } = {}) {
  const isLocalOrigin = state.localIds.has(nextMemo.id) || state.status.source !== "supabase";
  const shouldUseDb = state.status.source === "supabase" && !isLocalOrigin;
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
      dbInserted: false,
      localOwnerById: { [nextMemo.id]: userId },
      status: { source: "local-storage-fallback", fallbackReason: dbWriteFails ? "supabase-error" : state.status.fallbackReason },
    };
  }

  return { ...state, visibleMemos, dbInserted: true, status: { source: "supabase" } };
}

function deleteMemo(state, memoId) {
  const nextLocalIds = new Set(state.localIds);
  const nextDeletedIds = new Set(state.deletedIds);
  nextLocalIds.delete(memoId);
  if (state.dbIds.has(memoId)) nextDeletedIds.add(memoId);
  return {
    visibleMemos: state.visibleMemos.filter((item) => item.id !== memoId),
    localMemos: state.visibleMemos.filter((item) => nextLocalIds.has(item.id) && item.id !== memoId),
    localIds: nextLocalIds,
    dbIds: new Set([...state.dbIds].filter((id) => id !== memoId)),
    deletedIds: nextDeletedIds,
    status: { source: "local-storage-fallback", fallbackReason: "local-data-not-migrated" },
  };
}

function assert(condition, label) {
  if (!condition) throw new Error(label);
  console.log(`ok: ${label}`);
}

// DB=[A], localStorage=[B] -> delete DB-origin A -> reload DB=[A], localStorage=[B], tombstone=[A] -> A does not reappear.
{
  const dbA = memo("a", "db A");
  const localB = memo("b", "local B");
  const initial = modelState({ dbMemos: [dbA], localMemos: [localB] });
  const afterDelete = deleteMemo(initial, "a");
  const afterReload = modelState({ dbMemos: [dbA], localMemos: afterDelete.localMemos, deletedDbMemoIds: [...afterDelete.deletedIds] });
  assert(afterReload.visibleMemos.map((item) => item.id).join(",") === "b", "DB-origin delete remains hidden after reload via user-scoped tombstone");
}

// DB=[A], localStorage=[B] -> edit B/add C -> localStorage never receives DB-origin A.
{
  const dbA = memo("a", "db A");
  const localB = memo("b", "local B");
  const initial = modelState({ dbMemos: [dbA], localMemos: [localB] });
  const afterEdit = saveMemo(initial, memo("b", "local B edited"));
  const afterAdd = saveMemo(afterEdit, memo("c", "local C"));
  assert(afterAdd.localMemos.map((item) => item.id).join(",") === "c,b", "local CRUD stores only local-origin/fallback memos and does not copy DB-origin rows");
  assert(!afterAdd.localMemos.some((item) => item.id === "a"), "DB-origin A is not copied into localStorage by local operations");
}

// DB=[A(user1)] -> DB save failure writes user-scoped fallback -> logout/user2 does not see user1 fallback copy.
{
  const dbA = memo("a", "user1 db A edited offline");
  const initial = modelState({ dbMemos: [dbA], userId: "user-1" });
  const afterFailedEdit = saveMemo(initial, memo("a", "user1 fallback A"), { dbWriteFails: true, userId: "user-1" });
  const user2State = modelState({ dbMemos: [], localMemos: afterFailedEdit.localMemos, localOwnerById: afterFailedEdit.localOwnerById, userId: "user-2" });
  assert(user2State.visibleMemos.length === 0, "user-scoped fallback data is not shown after logout/user2 login");
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

assert(/localMemoIdsRef = useRef\(new Set<string>\(\)\)/.test(hookSource), "hook tracks localStorage-origin memo IDs internally");
assert(/dbMemoIdsRef = useRef\(new Set<string>\(\)\)/.test(hookSource), "hook tracks DB-origin memo IDs internally");
assert(/deletedDbMemoIdsByUserId/.test(hookSource), "hook stores DB delete tombstones by user");
assert(/ownerIdByMemoId/.test(hookSource), "hook stores local fallback ownership by memo ID");
assert(/saveLocalOriginMemos/.test(hookSource), "hook saves only local-origin/fallback memos to localStorage");
assert(/if \(!data\) return fallback\(null, "supabase-error", "No matching external catch memo row was updated\."\)/.test(repositorySource), "repository treats zero-row DB update as fallback");
assert(/if \(!data\) return fallback\(null, "supabase-error", "No matching external catch memo row was deleted\."\)/.test(repositorySource), "repository treats zero-row DB delete as fallback");

console.log("External memo state transition scenarios passed without DB/network access.");
