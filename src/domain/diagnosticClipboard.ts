export type DiagnosticCopyResult = "success" | "fallback";

export async function copyDiagnosticText(text: string, clipboard?: Pick<Clipboard, "writeText">): Promise<DiagnosticCopyResult> {
  if (!clipboard?.writeText) return "fallback";
  try {
    await clipboard.writeText(text);
    return "success";
  } catch {
    return "fallback";
  }
}
