import assert from "node:assert/strict";
import { detectImageFormat, prepareRecordPhoto, RecordPhotoDecodeError } from "../src/domain/recordPhoto";

assert.equal(detectImageFormat(Uint8Array.from([0xff, 0xd8, 0xff])), "jpeg");
assert.equal(detectImageFormat(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])), "png");
assert.equal(detectImageFormat(new TextEncoder().encode("RIFFxxxxWEBP")), "webp");
assert.equal(detectImageFormat(new TextEncoder().encode("xxxxftypheic")), "heif");

const source = (type = "image/jpeg", signature = [0xff, 0xd8, 0xff]) => {
  const blob = new Blob([Uint8Array.from(signature), new Uint8Array(100)], { type }) as File;
  Object.defineProperty(blob, "name", { value: "android-photo.jpg" }); return blob;
};
let bitmapCalls = 0, closed = 0, revoked: string[] = [], objectLoads = 0, dataLoads = 0;
let bitmapSuccessAt = 2, objectSucceeds = true, dataSucceeds = true;
class Reader {
  result: string | ArrayBuffer | null = null; onload: null | (() => void) = null; onerror = null; onabort = null;
  readAsDataURL() { this.result = "data:image/jpeg;base64,/9j/"; queueMicrotask(() => this.onload?.()); }
}
class TestImage {
  naturalWidth = 640; naturalHeight = 480; onload: null | (() => void) = null; onerror: null | (() => void) = null; private value = "";
  set src(value: string) { this.value = value; if (!value) return; const object = value.startsWith("blob:source"); if (object) objectLoads++; else dataLoads++; queueMicrotask(() => (object ? objectSucceeds : dataSucceeds) ? this.onload?.() : this.onerror?.()); }
  get src() { return this.value; }
}
const context = { fillStyle: "", fillRect() {}, drawImage() {} };
const canvas = { width: 0, height: 0, getContext: () => context, toBlob: (callback: (blob: Blob | null) => void) => callback(new Blob(["webp"], { type: "image/webp" })) };
Object.assign(globalThis, { document: { createElement: () => canvas }, FileReader: Reader, Image: TestImage,
  createImageBitmap: async () => { bitmapCalls++; if (bitmapCalls !== bitmapSuccessAt) throw new DOMException("decode failed", "InvalidStateError"); return { width: 640, height: 480, close: () => closed++ }; } });
Object.assign(URL, { createObjectURL: (blob: Blob) => blob.type === "image/webp" ? "blob:preview" : "blob:source", revokeObjectURL: (url: string) => revoked.push(url) });

await prepareRecordPhoto(source());
assert.equal(bitmapCalls, 2, "option-less bitmap is tried independently"); assert.equal(closed, 1);

bitmapCalls = 0; bitmapSuccessAt = -1; objectSucceeds = true;
await prepareRecordPhoto(source());
assert.equal(objectLoads, 1); assert.ok(revoked.includes("blob:source"), "successful object URL is revoked after drawing");

objectSucceeds = false; dataSucceeds = true; revoked = [];
await prepareRecordPhoto(source());
assert.ok(dataLoads > 0); assert.ok(revoked.includes("blob:source"), "failed object URL is revoked");

objectSucceeds = false; dataSucceeds = false;
const mismatch = source("image/png");
const failure = await prepareRecordPhoto(mismatch).then(() => null, (error: unknown) => error);
assert.ok(failure instanceof RecordPhotoDecodeError);
assert.equal(failure.diagnostic.mimeMismatch, true);
assert.deepEqual(failure.diagnostic.attempts.map((attempt) => attempt.route), ["bitmap-oriented", "bitmap", "object-url", "data-url"]);
assert.ok(failure.diagnostic.attempts.every((attempt) => attempt.result === "failed"));

const heif = source("image/heic", [...new TextEncoder().encode("xxxxftypheic")]);
await assert.rejects(prepareRecordPhoto(heif), /HEIF\/HEIC.*JPEGまたはPNG/);
console.log("Issue #408 staged photo decode, diagnostics, magic bytes, and cleanup checks passed.");
