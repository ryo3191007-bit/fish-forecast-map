import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareRecordPhoto } from "../src/domain/recordPhoto";

const jpeg = new Blob([new Uint8Array(346_107)], { type: "image/jpeg" }) as File;
let bitmapClosed = 0, fallbackReads = 0, drawnSource: unknown;
class WorkingFileReader {
  result: string | ArrayBuffer | null = null;
  onload: null | (() => void) = null; onerror: null | (() => void) = null; onabort: null | (() => void) = null;
  readAsDataURL() { fallbackReads += 1; this.result = "data:image/jpeg;base64,/9j/"; queueMicrotask(() => this.onload?.()); }
}
class WorkingImage {
  naturalWidth = 692; naturalHeight = 1536;
  onload: null | (() => void) = null; onerror: null | (() => void) = null;
  private value = "";
  set src(value: string) { this.value = value; if (value) queueMicrotask(() => this.onload?.()); }
  get src() { return this.value; }
}
const context = { fillStyle: "", fillRect() {}, drawImage(source: unknown) { drawnSource = source; } };
const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (callback: (blob: Blob | null) => void) => callback(new Blob([new Uint8Array(32_000)], { type: "image/webp" })) };
Object.assign(globalThis, {
  document: { createElement: () => canvas }, FileReader: WorkingFileReader, Image: WorkingImage,
});

const bitmap = { width: 692, height: 1536, close: () => { bitmapClosed += 1; } };
Object.assign(globalThis, { createImageBitmap: async () => bitmap });
const primary = await prepareRecordPhoto(jpeg);
assert.deepEqual({ width: primary.width, height: primary.height }, { width: 577, height: 1280 });
assert.equal(primary.blob.type, "image/webp"); assert.ok(primary.blob.size <= 450 * 1024);
assert.equal(drawnSource, bitmap); assert.equal(bitmapClosed, 1); assert.equal(fallbackReads, 0);

Object.assign(globalThis, { createImageBitmap: async () => { throw new Error("Android bitmap decode failed"); } });
const fallback = await prepareRecordPhoto(jpeg);
assert.deepEqual({ width: fallback.width, height: fallback.height }, { width: 577, height: 1280 });
assert.equal(fallbackReads, 0); assert.ok(drawnSource instanceof WorkingImage);
assert.equal((drawnSource as WorkingImage).src, "", "fallback image releases its object URL reference");

class FailingImage extends WorkingImage { override set src(value: string) { if (value) queueMicrotask(() => this.onerror?.()); } }
Object.assign(globalThis, { Image: FailingImage });
await assert.rejects(prepareRecordPhoto(jpeg), /JPEG、PNG、WebP.*変換して再選択/);

const editor = await readFile("src/components/RecordPhotoEditor.tsx", "utf8");
assert.doesNotMatch(editor, /長辺1280px以下・WebP・450KiB以下へ端末内で変換/);
console.log("Issue #405 Android photo decode and cleanup checks passed.");
