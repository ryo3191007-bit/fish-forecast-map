import assert from "node:assert/strict";
import { detectImageFormat, prepareRecordPhoto, RecordPhotoDecodeError } from "../src/domain/recordPhoto";
import { copyDiagnosticText, initialDiagnosticCopyState, transitionDiagnosticCopyState } from "../src/domain/diagnosticClipboard";
import { readFile } from "node:fs/promises";

assert.equal(detectImageFormat(Uint8Array.from([0xff, 0xd8, 0xff])), "jpeg");
assert.equal(detectImageFormat(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])), "png");
assert.equal(detectImageFormat(new TextEncoder().encode("RIFFxxxxWEBP")), "webp");
assert.equal(detectImageFormat(new TextEncoder().encode("xxxxftypheic")), "heif");

const source = (type = "image/jpeg", signature = [0xff, 0xd8, 0xff]) => {
  const blob = new Blob([Uint8Array.from(signature), new Uint8Array(100)], { type }) as File;
  Object.defineProperty(blob, "name", { value: "android-photo.jpg" }); return blob;
};
const unreadableHeaderSource = (type = "image/jpeg") => {
  const file = source(type);
  Object.defineProperty(file, "slice", { value: () => ({ arrayBuffer: async () => { throw new DOMException("picker stream unavailable", "NotReadableError"); } }) });
  return file;
};
let headerReads = 0, poisoned = false;
const poisoningSource = () => {
  const file = source();
  Object.defineProperty(file, "slice", { value: () => ({ arrayBuffer: async () => { headerReads++; poisoned = true; throw new DOMException("picker stream unavailable", "NotReadableError"); } }) });
  return file;
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
  createImageBitmap: async () => { bitmapCalls++; if (poisoned || bitmapCalls !== bitmapSuccessAt) throw new DOMException("decode failed", "InvalidStateError"); return { width: 640, height: 480, close: () => closed++ }; } });
Object.assign(URL, { createObjectURL: (blob: Blob) => blob.type === "image/webp" ? "blob:preview" : "blob:source", revokeObjectURL: (url: string) => revoked.push(url) });

await prepareRecordPhoto(source());
assert.equal(bitmapCalls, 2, "option-less bitmap is tried independently"); assert.equal(closed, 1);

bitmapCalls = 0; bitmapSuccessAt = 1; headerReads = 0; poisoned = false;
await prepareRecordPhoto(poisoningSource());
assert.equal(bitmapCalls, 1, "decode runs before a potentially poisoning header read");
assert.equal(headerReads, 0, "a successful decode leaves headerRead not-attempted and does not consume the File again");

bitmapCalls = 0; bitmapSuccessAt = 1; poisoned = false;
await prepareRecordPhoto(unreadableHeaderSource(""));
assert.equal(bitmapCalls, 1, "decode succeeds without attempting a header read for an empty MIME type");

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
assert.equal(failure.diagnostic.headerRead.result, "success", "header diagnostics run only after every decode route fails");

const headerFailure = await prepareRecordPhoto(unreadableHeaderSource("")).then(() => null, (error: unknown) => error);
assert.ok(headerFailure instanceof RecordPhotoDecodeError);
assert.equal(headerFailure.diagnostic.detectedFormat, "unknown");
assert.equal(headerFailure.diagnostic.headerRead.result, "failed");
assert.equal(headerFailure.diagnostic.declaredMimeType, "");
assert.match(headerFailure.diagnostic.headerRead.reason ?? "", /NotReadableError.*picker stream unavailable/);
assert.equal(headerFailure.diagnostic.attempts.length, 4);
assert.match(headerFailure.message, /「ファイルから選び直す」をお試しください/);
assert.match(headerFailure.message, /端末へ保存し直して再選択/);

const heif = source("image/heic", [...new TextEncoder().encode("xxxxftypheic")]);
await assert.rejects(prepareRecordPhoto(heif), /HEIF\/HEIC.*JPEGまたはPNG/);
let copied = "";
assert.equal(await copyDiagnosticText("diagnostic", { writeText: async (text) => { copied = text; } }), "success");
assert.equal(copied, "diagnostic");
assert.equal(await copyDiagnosticText("diagnostic"), "fallback");
assert.equal(await copyDiagnosticText("diagnostic", { writeText: async () => { throw new Error("denied"); } }), "fallback");
let copyState = transitionDiagnosticCopyState(initialDiagnosticCopyState, "fallback");
copyState = transitionDiagnosticCopyState(copyState, "selection-failed");
assert.deepEqual(copyState, { result: "fallback", selectionFailed: true }, "selection failure keeps the manual-copy view open");
copyState = transitionDiagnosticCopyState(copyState, "selection-success");
assert.deepEqual(copyState, { result: "fallback", selectionFailed: false }, "retrying selection clears only the selection error");
const editorSource = await readFile(new URL("../src/components/RecordPhotoEditor.tsx", import.meta.url), "utf8");
assert.match(editorSource, /診断情報をコピーしました/);
assert.match(editorSource, /自動コピーを利用できません/);
assert.match(editorSource, /診断情報を選択できませんでした/);
assert.match(editorSource, /<textarea[^>]+readOnly/);
assert.match(editorSource, /copyState\.result === "fallback"[\s\S]+<textarea[\s\S]+copyState\.selectionFailed/, "selection feedback is rendered inside the persistent fallback region");
assert.match(editorSource, /accept=\{RECORD_PHOTO_FILES_FALLBACK_ACCEPT\}/);
assert.match(editorSource, /image\/jpeg,image\/png,image\/webp,application\/x-fishtrace-file-picker/, "the fallback accept includes a non-media MIME to request the generic Files chooser");
assert.match(editorSource, /setFilesFallbackAvailable\(isRecordPhotoNotReadableDiagnostic\(value\.diagnostic\)\)/, "the Files fallback is offered only for the unreadable diagnostic path");
assert.match(editorSource, /ref=\{filesFallbackInput\}[\s\S]+onChange=\{\(event\) => void choose\(event\.target\.files\)\}/, "fallback selection rejoins the existing prepare and upload flow");
assert.match(editorSource, /filesFallbackAvailable \? <button[^>]+[\s\S]+ファイルから選び直す/, "the fallback action is conditional on unreadable File data");
console.log("Issue #408 staged photo decode, diagnostics, magic bytes, and cleanup checks passed.");
