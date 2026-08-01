import type { PreparedRecordPhoto, RecordPhoto, RecordPhotoTargetType } from "@/domain/recordPhoto";
import { getSupabaseClient } from "@/lib/supabaseClient";

const BUCKET = "private-record-photos";
type Row = { id: string; target_type: RecordPhotoTargetType; catch_memo_id: string | null; field_report_id: string | null; storage_path: string; sort_order: number; mime_type: "image/webp"; byte_size: number; width: number; height: number };

export function isRecordPhotoBackendMissing(error: unknown): boolean {
  const value = error as { statusCode?: string | number; code?: string; message?: string } | null;
  return value?.code === "42P01" || value?.code === "PGRST202" || value?.code === "PGRST205" ||
    (String(value?.statusCode) === "404" && /bucket not found/i.test(value?.message ?? ""));
}

function configuredClient() {
  const status = getSupabaseClient();
  if (!status.isConfigured) throw new Error("record-photo-unavailable");
  return status.client;
}

const mapRow = (row: Row): RecordPhoto => ({ id: row.id, targetType: row.target_type, targetId: row.catch_memo_id ?? row.field_report_id ?? "", storagePath: row.storage_path, sortOrder: row.sort_order, mimeType: row.mime_type, byteSize: row.byte_size, width: row.width, height: row.height });

export async function fetchRecordPhotos(targetType: RecordPhotoTargetType, targetId: string): Promise<RecordPhoto[]> {
  const column = targetType === "catch_memo" ? "catch_memo_id" : "field_report_id";
  const { data, error } = await configuredClient().from("record_photos").select("id,target_type,catch_memo_id,field_report_id,storage_path,sort_order,mime_type,byte_size,width,height").eq("target_type", targetType).eq(column, targetId).order("sort_order");
  if (error) throw error;
  const photos = (data as Row[]).map(mapRow);
  await Promise.all(photos.map(async (photo) => {
    const { data: signed, error: signedError } = await configuredClient().storage.from(BUCKET).createSignedUrl(photo.storagePath, 300);
    if (!signedError) photo.signedUrl = signed.signedUrl;
  }));
  return photos.filter((photo) => photo.signedUrl);
}

async function listRecordPhotos(targetType: RecordPhotoTargetType, targetId: string): Promise<RecordPhoto[]> {
  const column = targetType === "catch_memo" ? "catch_memo_id" : "field_report_id";
  const { data, error } = await configuredClient().from("record_photos").select("id,target_type,catch_memo_id,field_report_id,storage_path,sort_order,mime_type,byte_size,width,height").eq("target_type", targetType).eq(column, targetId).order("sort_order");
  if (error) throw error;
  return (data as Row[]).map(mapRow);
}

export async function uploadRecordPhotos(targetType: RecordPhotoTargetType, targetId: string, photos: PreparedRecordPhoto[], startingOrder: number): Promise<void> {
  const client = configuredClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) throw new Error("写真の保存にはログインが必要です。");
  for (const [index, photo] of photos.entries()) {
    const path = `${auth.user.id}/${targetType}/${targetId}/${photo.id}.webp`;
    const { error: uploadError } = await client.storage.from(BUCKET).upload(path, photo.blob, { contentType: "image/webp", upsert: false });
    if (uploadError) throw uploadError;
    const { error: metadataError } = await client.rpc("add_my_record_photo", { p_photo_id: photo.id, p_target_type: targetType, p_target_id: targetId, p_storage_path: path, p_sort_order: startingOrder + index, p_mime_type: "image/webp", p_byte_size: photo.blob.size, p_width: photo.width, p_height: photo.height });
    if (metadataError) {
      await client.storage.from(BUCKET).remove([path]);
      throw metadataError;
    }
  }
}

export async function deleteRecordPhoto(photo: RecordPhoto): Promise<void> {
  const client = configuredClient();
  const { error: storageError } = await client.storage.from(BUCKET).remove([photo.storagePath]);
  if (storageError) throw storageError;
  const { error } = await client.rpc("remove_my_record_photo", { p_photo_id: photo.id });
  if (error) throw error;
}

export async function removeCatchPhotoObjectsBeforeDelete(memoId: string): Promise<void> {
  const photos = await listRecordPhotos("catch_memo", memoId);
  if (!photos.length) return;
  const { error } = await configuredClient().storage.from(BUCKET).remove(photos.map((photo) => photo.storagePath));
  if (error) throw error;
}
