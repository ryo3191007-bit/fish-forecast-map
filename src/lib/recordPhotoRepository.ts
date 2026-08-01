import type { PreparedRecordPhoto, RecordPhoto, RecordPhotoTargetType } from "@/domain/recordPhoto";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { allocateRecordPhotoSlots } from "@/domain/recordPhotoUpload";

const BUCKET = "private-record-photos";
type Row = { id: string; target_type: RecordPhotoTargetType; catch_memo_id: string | null; field_report_id: string | null; storage_path: string; sort_order: number; mime_type: "image/webp"; byte_size: number; width: number; height: number };

export class RecordPhotoBatchError extends Error {
  constructor(message: string, readonly completedPhotoIds: string[], readonly cause?: unknown) { super(message); this.name = "RecordPhotoBatchError"; }
}

export function isRecordPhotoBackendMissing(error: unknown): boolean {
  const value = error as { statusCode?: string | number; code?: string; message?: string } | null;
  const message = value?.message ?? "";
  return (value?.code === "42P01" && /record_photos/i.test(message)) ||
    (value?.code === "PGRST202" && /(?:add|remove)_my_record_photo/i.test(message)) ||
    (value?.code === "PGRST205" && /record_photos/i.test(message)) ||
    (String(value?.statusCode) === "404" && /private-record-photos|bucket not found/i.test(message));
}

function configuredClient() {
  const status = getSupabaseClient();
  if (!status.isConfigured) throw new Error("record-photo-unavailable");
  return status.client;
}

export async function checkRecordPhotoBackend(): Promise<boolean> {
  try {
    const client = configuredClient();
    const { error: tableError } = await client.from("record_photos").select("id").limit(1);
    if (tableError) throw tableError;
    const { error: bucketError } = await client.storage.from(BUCKET).list("", { limit: 1 });
    if (bucketError) throw bucketError;
    return true;
  } catch (error) {
    if (isRecordPhotoBackendMissing(error) || (error instanceof Error && error.message === "record-photo-unavailable")) return false;
    throw error;
  }
}

const mapRow = (row: Row): RecordPhoto => ({ id: row.id, targetType: row.target_type, targetId: row.catch_memo_id ?? row.field_report_id ?? "", storagePath: row.storage_path, sortOrder: row.sort_order, mimeType: row.mime_type, byteSize: row.byte_size, width: row.width, height: row.height });

async function listRecordPhotos(targetType: RecordPhotoTargetType, targetId: string): Promise<RecordPhoto[]> {
  const column = targetType === "catch_memo" ? "catch_memo_id" : "field_report_id";
  const { data, error } = await configuredClient().from("record_photos").select("id,target_type,catch_memo_id,field_report_id,storage_path,sort_order,mime_type,byte_size,width,height").eq("target_type", targetType).eq(column, targetId).order("sort_order");
  if (error) throw error;
  return (data as Row[]).map(mapRow);
}

export async function fetchRecordPhotos(targetType: RecordPhotoTargetType, targetId: string): Promise<RecordPhoto[]> {
  const photos = await listRecordPhotos(targetType, targetId);
  await Promise.all(photos.map(async (photo) => {
    const { data, error } = await configuredClient().storage.from(BUCKET).createSignedUrl(photo.storagePath, 300);
    if (!error) photo.signedUrl = data.signedUrl;
  }));
  return photos;
}

async function targetFolder(targetType: RecordPhotoTargetType, targetId: string) {
  const client = configuredClient();
  const { data } = await client.auth.getUser();
  if (!data.user) throw new Error("写真の保存にはログインが必要です。");
  return `${data.user.id}/${targetType}/${targetId}`;
}

export async function reconcileRecordPhotoObjects(targetType: RecordPhotoTargetType, targetId: string): Promise<void> {
  const client = configuredClient();
  const folder = await targetFolder(targetType, targetId);
  const [photos, listing] = await Promise.all([listRecordPhotos(targetType, targetId), client.storage.from(BUCKET).list(folder, { limit: 100 })]);
  if (listing.error) throw listing.error;
  const registered = new Set(photos.map((photo) => photo.storagePath));
  const orphans = (listing.data ?? []).map((object) => `${folder}/${object.name}`).filter((path) => !registered.has(path));
  if (orphans.length) {
    const { error } = await client.storage.from(BUCKET).remove(orphans);
    if (error) throw new Error(`孤立写真を回収できませんでした: ${error.message}`);
  }
}

export async function uploadRecordPhotos(targetType: RecordPhotoTargetType, targetId: string, photos: PreparedRecordPhoto[]): Promise<string[]> {
  const client = configuredClient();
  const folder = await targetFolder(targetType, targetId);
  await reconcileRecordPhotoObjects(targetType, targetId);
  const existing = await listRecordPhotos(targetType, targetId);
  const slots = allocateRecordPhotoSlots(existing.map((photo) => photo.sortOrder), photos.length);
  const completed: string[] = [];
  for (const [index, photo] of photos.entries()) {
    const path = `${folder}/${photo.id}.webp`;
    const { error: uploadError } = await client.storage.from(BUCKET).upload(path, photo.blob, { contentType: "image/webp", upsert: false });
    if (uploadError) throw new RecordPhotoBatchError(uploadError.message, completed, uploadError);
    const { error: metadataError } = await client.rpc("add_my_record_photo", { p_photo_id: photo.id, p_target_type: targetType, p_target_id: targetId, p_storage_path: path, p_sort_order: slots[index], p_mime_type: "image/webp", p_byte_size: photo.blob.size, p_width: photo.width, p_height: photo.height });
    if (metadataError) {
      const { error: cleanupError } = await client.storage.from(BUCKET).remove([path]);
      const message = cleanupError ? `写真情報の保存と補償削除に失敗しました: ${cleanupError.message}` : metadataError.message;
      throw new RecordPhotoBatchError(message, completed, cleanupError ?? metadataError);
    }
    completed.push(photo.id);
  }
  return completed;
}

export async function deleteRecordPhoto(photo: RecordPhoto): Promise<void> {
  const client = configuredClient();
  const { error: storageError } = await client.storage.from(BUCKET).remove([photo.storagePath]);
  if (storageError) throw storageError;
  const { error } = await client.rpc("remove_my_record_photo", { p_photo_id: photo.id });
  if (error) throw error;
}

export async function removeCatchPhotoObjectsBeforeDelete(memoId: string): Promise<void> {
  const folder = await targetFolder("catch_memo", memoId);
  const client = configuredClient();
  const { data, error: listError } = await client.storage.from(BUCKET).list(folder, { limit: 100 });
  if (listError) throw listError;
  const paths = (data ?? []).map((object) => `${folder}/${object.name}`);
  if (paths.length) { const { error } = await client.storage.from(BUCKET).remove(paths); if (error) throw error; }
}
