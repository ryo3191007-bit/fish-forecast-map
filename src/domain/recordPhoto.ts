export type RecordPhotoTargetType = "catch_memo" | "field_report";

export type RecordPhoto = {
  id: string;
  targetType: RecordPhotoTargetType;
  targetId: string;
  storagePath: string;
  sortOrder: number;
  mimeType: "image/webp";
  byteSize: number;
  width: number;
  height: number;
  signedUrl?: string;
};

export type PreparedRecordPhoto = {
  id: string;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
};

export const RECORD_PHOTO_LIMIT = 3;
export const RECORD_PHOTO_MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const RECORD_PHOTO_MAX_BYTES = 450 * 1024;
export const RECORD_PHOTO_MAX_EDGE = 1280;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("画像を読み込めませんでした。")); };
    image.src = url;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob?.type === "image/webp" ? resolve(blob) : reject(new Error("このブラウザはWebP変換に対応していません。")),
    "image/webp",
    quality,
  ));
}

export async function prepareRecordPhoto(file: File): Promise<PreparedRecordPhoto> {
  if (!file.type.startsWith("image/")) throw new Error("画像ファイルを選択してください。");
  if (file.size > RECORD_PHOTO_MAX_SOURCE_BYTES) throw new Error("元画像は1枚20MB以下にしてください。");
  const image = await loadImage(file);
  const scale = Math.min(1, RECORD_PHOTO_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("画像を変換できませんでした。");
  context.fillStyle = "#ffffff"; context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  let blob: Blob | null = null;
  for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42, 0.32]) {
    blob = await canvasToWebp(canvas, quality);
    if (blob.size <= RECORD_PHOTO_MAX_BYTES) break;
  }
  if (!blob || blob.size > RECORD_PHOTO_MAX_BYTES) throw new Error("450KiB以下に圧縮できませんでした。別の画像を選択してください。");
  return { id: crypto.randomUUID(), blob, previewUrl: URL.createObjectURL(blob), width, height };
}
