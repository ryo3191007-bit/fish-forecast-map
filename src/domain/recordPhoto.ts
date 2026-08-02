export type RecordPhotoTargetType = "catch_memo" | "field_report";
export type RecordPhoto = { id: string; targetType: RecordPhotoTargetType; targetId: string; storagePath: string; sortOrder: number; mimeType: "image/webp"; byteSize: number; width: number; height: number; signedUrl?: string };
export type PreparedRecordPhoto = { id: string; blob: Blob; previewUrl: string; width: number; height: number };
export type ImageFileFormat = "jpeg" | "png" | "webp" | "heif" | "unknown";
export type DecodeAttempt = { route: "bitmap-oriented" | "bitmap" | "object-url" | "data-url"; result: "success" | "failed" | "unavailable"; reason?: string };
export type HeaderReadDiagnostic = { result: "not-attempted" | "success" | "failed"; reason?: string };
export type RecordPhotoDiagnostic = { fileName: string; declaredMimeType: string; byteSize: number; detectedFormat: ImageFileFormat; mimeMismatch: boolean; headerRead: HeaderReadDiagnostic; apiAvailability: { createImageBitmap: boolean; objectUrl: boolean; fileReader: boolean; image: boolean }; attempts: DecodeAttempt[] };

export class RecordPhotoDecodeError extends Error {
  constructor(message: string, public readonly diagnostic: RecordPhotoDiagnostic) { super(message); this.name = "RecordPhotoDecodeError"; }
}
export const RECORD_PHOTO_LIMIT = 3;
export const RECORD_PHOTO_MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const RECORD_PHOTO_MAX_BYTES = 450 * 1024;
export const RECORD_PHOTO_MAX_EDGE = 1280;
type DecodedImage = { source: CanvasImageSource; width: number; height: number; cleanup: () => void };
const unsupportedImageMessage = "画像形式を読み込めませんでした。JPEG、PNG、WebPのいずれかへ変換して再選択してください。";
const heifMessage = "HEIF/HEIC画像には対応していません。端末の写真アプリでJPEGまたはPNGとして書き出して再選択してください。";
const unreadableImageMessage = "ブラウザが写真を読み取れませんでした。Chromeで開くか、端末へ保存し直して再選択してください。";

export function detectImageFormat(bytes: Uint8Array): ImageFileFormat {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  if (String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
    const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "heif";
  }
  return "unknown";
}
const expectedMime = (format: ImageFileFormat) => format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : format === "webp" ? "image/webp" : format === "heif" ? "image/heif" : "";
const failureReason = (value: unknown) => value instanceof Error ? `${value.name}: ${value.message}` : String(value);

function loadHtmlImage(src: string, release: () => void): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image(); let cleaned = false;
    const cleanup = () => { if (cleaned) return; cleaned = true; image.onload = null; image.onerror = null; image.src = ""; release(); };
    image.onload = () => resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, cleanup });
    image.onerror = () => { cleanup(); reject(new Error("HTMLImageElement decode failed")); };
    image.src = src;
  });
}
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); const cleanup = () => { reader.onload = null; reader.onerror = null; reader.onabort = null; };
    reader.onload = () => { const result = reader.result; cleanup(); if (typeof result === "string") resolve(result); else reject(new Error("FileReader returned no data URL")); };
    reader.onerror = () => { cleanup(); reject(new Error("FileReader failed")); };
    reader.onabort = () => { cleanup(); reject(new Error("FileReader aborted")); }; reader.readAsDataURL(file);
  });
}
async function loadImage(file: File, diagnostic: RecordPhotoDiagnostic): Promise<DecodedImage | null> {
  const attempt = async (route: DecodeAttempt["route"], available: boolean, load: () => Promise<DecodedImage>) => {
    if (!available) { diagnostic.attempts.push({ route, result: "unavailable" }); return null; }
    try { const image = await load(); diagnostic.attempts.push({ route, result: "success" }); return image; }
    catch (error) { diagnostic.attempts.push({ route, result: "failed", reason: failureReason(error) }); return null; }
  };
  const bitmapAvailable = diagnostic.apiAvailability.createImageBitmap;
  let image = await attempt("bitmap-oriented", bitmapAvailable, async () => { const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() }; });
  image ??= await attempt("bitmap", bitmapAvailable, async () => { const bitmap = await createImageBitmap(file); return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() }; });
  image ??= await attempt("object-url", diagnostic.apiAvailability.objectUrl && diagnostic.apiAvailability.image, async () => {
    const url = URL.createObjectURL(file); let handedOff = false;
    try { const decoded = await loadHtmlImage(url, () => URL.revokeObjectURL(url)); handedOff = true; return decoded; }
    finally { if (!handedOff) URL.revokeObjectURL(url); }
  });
  image ??= await attempt("data-url", diagnostic.apiAvailability.fileReader && diagnostic.apiAvailability.image, async () => loadHtmlImage(await readAsDataUrl(file), () => {}));
  return image;
}
function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob?.type === "image/webp" ? resolve(blob) : reject(new Error("このブラウザはWebP変換に対応していません。")), "image/webp", quality));
}
export function formatRecordPhotoDiagnostic(diagnostic: RecordPhotoDiagnostic): string { return JSON.stringify({ generatedAt: new Date().toISOString(), ...diagnostic }, null, 2); }

export async function prepareRecordPhoto(file: File): Promise<PreparedRecordPhoto> {
  if (file.size > RECORD_PHOTO_MAX_SOURCE_BYTES) throw new Error("元画像は1枚20MB以下にしてください。");
  const declaredMimeType = file.type.toLowerCase();
  const diagnostic: RecordPhotoDiagnostic = { fileName: file.name, declaredMimeType, byteSize: file.size, detectedFormat: "unknown", mimeMismatch: false, headerRead: { result: "not-attempted" }, apiAvailability: { createImageBitmap: typeof createImageBitmap === "function", objectUrl: typeof URL.createObjectURL === "function", fileReader: typeof FileReader === "function", image: typeof Image === "function" }, attempts: [] };
  const image = await loadImage(file, diagnostic);
  if (!image) {
    try {
      diagnostic.detectedFormat = detectImageFormat(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
      diagnostic.headerRead = { result: "success" };
      const detectedMime = expectedMime(diagnostic.detectedFormat);
      diagnostic.mimeMismatch = Boolean(detectedMime && declaredMimeType && detectedMime !== declaredMimeType && !(diagnostic.detectedFormat === "heif" && declaredMimeType === "image/heic"));
    } catch (error) {
      diagnostic.headerRead = { result: "failed", reason: failureReason(error) };
    }
    const headerNotReadable = diagnostic.headerRead.result === "failed" && diagnostic.headerRead.reason?.startsWith("NotReadableError:");
    const message = headerNotReadable ? unreadableImageMessage
      : diagnostic.detectedFormat === "heif" ? heifMessage
      : diagnostic.headerRead.result === "success" && diagnostic.detectedFormat === "unknown" && !declaredMimeType.startsWith("image/") ? "画像ファイルを選択してください。"
      : unsupportedImageMessage;
    throw new RecordPhotoDecodeError(message, diagnostic);
  }
  try {
    const scale = Math.min(1, RECORD_PHOTO_MAX_EDGE / Math.max(image.width, image.height)); const width = Math.max(1, Math.round(image.width * scale)), height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("画像を変換できませんでした。"); context.fillStyle = "#ffffff"; context.fillRect(0, 0, width, height); context.drawImage(image.source, 0, 0, width, height);
    let blob: Blob | null = null; for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42, 0.32]) { blob = await canvasToWebp(canvas, quality); if (blob.size <= RECORD_PHOTO_MAX_BYTES) break; }
    if (!blob || blob.size > RECORD_PHOTO_MAX_BYTES) throw new Error("450KiB以下に圧縮できませんでした。別の画像を選択してください。");
    return { id: crypto.randomUUID(), blob, previewUrl: URL.createObjectURL(blob), width, height };
  } finally { image.cleanup(); }
}
