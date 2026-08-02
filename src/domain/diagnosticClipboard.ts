export type DiagnosticCopyResult = "success" | "fallback";
export type DiagnosticCopyState = { result: DiagnosticCopyResult | null; selectionFailed: boolean };
export type DiagnosticCopyEvent = DiagnosticCopyResult | "selection-success" | "selection-failed" | "reset";

export const initialDiagnosticCopyState: DiagnosticCopyState = { result: null, selectionFailed: false };

export function transitionDiagnosticCopyState(state: DiagnosticCopyState, event: DiagnosticCopyEvent): DiagnosticCopyState {
  if (event === "reset") return initialDiagnosticCopyState;
  if (event === "success" || event === "fallback") return { result: event, selectionFailed: false };
  if (event === "selection-failed") return { result: "fallback", selectionFailed: true };
  return { ...state, result: "fallback", selectionFailed: false };
}

export async function copyDiagnosticText(text: string, clipboard?: Pick<Clipboard, "writeText">): Promise<DiagnosticCopyResult> {
  if (!clipboard?.writeText) return "fallback";
  try {
    await clipboard.writeText(text);
    return "success";
  } catch {
    return "fallback";
  }
}
