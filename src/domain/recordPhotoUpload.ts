import type { PreparedRecordPhoto } from "@/domain/recordPhoto";

export function allocateRecordPhotoSlots(existingOrders: readonly number[], requestedCount: number): number[] {
  const occupied = new Set(existingOrders);
  const available = [0, 1, 2].filter((slot) => !occupied.has(slot));
  if (requestedCount > available.length) throw new Error("写真は1記録につき最大3枚です。");
  return available.slice(0, requestedCount);
}

export function remainingRecordPhotos(photos: readonly PreparedRecordPhoto[], completedPhotoIds: readonly string[]): PreparedRecordPhoto[] {
  const completed = new Set(completedPhotoIds);
  return photos.filter((photo) => !completed.has(photo.id));
}

export async function resolveRecordPhotoTargetId(savedTargetId: string | null, saveBody: () => Promise<string | null>): Promise<string | null> {
  return savedTargetId ?? saveBody();
}
