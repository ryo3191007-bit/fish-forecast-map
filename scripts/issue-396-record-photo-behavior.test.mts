import assert from "node:assert/strict";
import { allocateRecordPhotoSlots, buildRecordPhotoStoragePath, mergePendingRecordPhotos, remainingRecordPhotos, resolveRecordPhotoTargetId } from "../src/domain/recordPhotoUpload";

assert.deepEqual(allocateRecordPhotoSlots([], 3), [0, 1, 2]);
assert.deepEqual(allocateRecordPhotoSlots([0], 2), [1, 2]);
assert.deepEqual(allocateRecordPhotoSlots([0, 2], 1), [1]);
assert.throws(() => allocateRecordPhotoSlots([0, 1, 2], 1), /最大3枚/);
assert.deepEqual([0, 1, 2].map((slot) => buildRecordPhotoStoragePath("owner/catch_memo/target", slot)), [
  "owner/catch_memo/target/0.webp",
  "owner/catch_memo/target/1.webp",
  "owner/catch_memo/target/2.webp",
]);
assert.throws(() => buildRecordPhotoStoragePath("owner/catch_memo/target", 3), /最大3枚/);

const photos = [{ id: "one" }, { id: "two" }, { id: "three" }] as never[];
assert.deepEqual(remainingRecordPhotos(photos, ["one", "three"]).map(({ id }) => id), ["two"]);
const previous = [{ id: "previous" }] as never[];
assert.deepEqual(mergePendingRecordPhotos(previous, photos, ["one", "three"]).map(({ id }) => id), ["previous", "two"]);

let bodySaves = 0;
const firstTarget = await resolveRecordPhotoTargetId(null, async () => { bodySaves += 1; return "target-1"; });
const retryTarget = await resolveRecordPhotoTargetId(firstTarget, async () => { bodySaves += 1; return "duplicate"; });
assert.equal(firstTarget, "target-1");
assert.equal(retryTarget, "target-1");
assert.equal(bodySaves, 1);

console.log("Issue #396 retry and slot behavior checks passed.");
