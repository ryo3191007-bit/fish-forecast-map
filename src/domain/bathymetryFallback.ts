export type BathymetryDataset = "gebco" | "etopo";
export type BathymetryDisplayState = "gebco" | "etopo" | "standard";
export type BathymetryFallbackEvent =
  | { type: "enter-bathymetry" }
  | { type: "source-success"; source: BathymetryDataset }
  | { type: "source-error"; source: BathymetryDataset; key: string };

export type BathymetryFallbackState = {
  display: BathymetryDisplayState;
  attempted: Record<BathymetryDataset, boolean>;
  failedKeys: string[];
  notice: string | null;
};

export const BATHYMETRY_STANDARD_NOTICE =
  "水深データを読み込めなかったため通常地図へ戻しました";

export function initialBathymetryFallbackState(): BathymetryFallbackState {
  return { display: "gebco", attempted: { gebco: true, etopo: false }, failedKeys: [], notice: null };
}

export function reduceBathymetryFallback(
  state: BathymetryFallbackState,
  event: BathymetryFallbackEvent,
): BathymetryFallbackState {
  if (event.type === "enter-bathymetry") return initialBathymetryFallbackState();
  if (event.type === "source-success") {
    return { ...state, display: event.source, notice: null };
  }
  const errorKey = `${event.source}:${event.key}`;
  if (state.failedKeys.includes(errorKey)) return state;
  const failedKeys = [...state.failedKeys, errorKey];
  if (event.source === "gebco") {
    return { display: "etopo", attempted: { gebco: true, etopo: true }, failedKeys, notice: null };
  }
  return { display: "standard", attempted: { gebco: true, etopo: true }, failedKeys, notice: BATHYMETRY_STANDARD_NOTICE };
}

export function isBathymetrySourceError(message: string, source: BathymetryDataset) {
  const lower = message.toLowerCase();
  return lower.includes(`/bathymetry/${source === "gebco" ? "gebco-2026" : "etopo-2022"}`) || lower.includes(source);
}
