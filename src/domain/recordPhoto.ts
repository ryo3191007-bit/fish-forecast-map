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

type DecodedImage = { source: CanvasImageSource; width: number; height: number; cleanup: () => void };

const unsupportedImageMessage = "画像形式を読み込めませんでした。JPEG、PNG、WebPのいずれかへ変換して再選択してください。";

async function loadImageWithBitmap(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap !== "function") throw new Error("ImageBitmap is unavailable");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error(unsupportedImageMessage));
    reader.onerror = () => reject(new Error(unsupportedImageMessage));
    reader.onabort = () => reject(new Error(unsupportedImageMessage));
    reader.readAsDataURL(file);
  });
}

async function loadImageWithDataUrl(file: File): Promise<DecodedImage> {
  const dataUrl = await readAsDataUrl(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => { image.onload = null; image.onerror = null; image.src = ""; };
    image.onload = () => resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, cleanup });
    image.onerror = () => { cleanup(); reject(new Error(unsupportedImageMessage)); };
    image.src = dataUrl;
  });
}

async function loadImage(file: File): Promise<DecodedImage> {
  try { return await loadImageWithBitmap(file); }
  catch { return loadImageWithDataUrl(file); }
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
  try {
    const scale = Math.min(1, RECORD_PHOTO_MAX_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("画像を変換できませんでした。");
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, width, height);
    context.drawImage(image.source, 0, 0, width, height);
    let blob: Blob | null = null;
    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42, 0.32]) {
      blob = await canvasToWebp(canvas, quality);
      if (blob.size <= RECORD_PHOTO_MAX_BYTES) break;
    }
    if (!blob || blob.size > RECORD_PHOTO_MAX_BYTES) throw new Error("450KiB以下に圧縮できませんでした。別の画像を選択してください。");
    return { id: crypto.randomUUID(), blob, previewUrl: URL.createObjectURL(blob), width, height };
  } finally { image.cleanup(); }
}
