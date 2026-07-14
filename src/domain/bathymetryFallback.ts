export type BathymetryDisplaySource = "gebco" | "etopo" | "standard";
export type BathymetryFailureSource = Exclude<
  BathymetryDisplaySource,
  "standard"
>;

export type BathymetryFallbackState = {
  display: BathymetryDisplaySource;
  failedKeys: string[];
  notice: string | null;
};

export type BathymetryFallbackEvent =
  | { type: "enter-bathymetry" }
  | { type: "source-success"; source: BathymetryFailureSource }
  | { type: "source-error"; source: BathymetryFailureSource; key: string };

export const BATHYMETRY_STANDARD_NOTICE =
  "水深データを読み込めなかったため通常地図へ戻しました";

export function initialBathymetryFallbackState(): BathymetryFallbackState {
  return { display: "gebco", failedKeys: [], notice: null };
}

export function reduceBathymetryFallback(
  state: BathymetryFallbackState,
  event: BathymetryFallbackEvent,
): BathymetryFallbackState {
  if (event.type === "enter-bathymetry") {
    return initialBathymetryFallbackState();
  }

  if (event.type === "source-success") {
    if (state.display !== event.source) return state;
    return { ...state, notice: null };
  }

  const errorKey = `${event.source}:${event.key}`;
  if (state.failedKeys.includes(errorKey)) return state;

  const failedKeys = [...state.failedKeys, errorKey];

  // 遅れて届いた非表示sourceのerrorでは、現在表示中のsourceを進めない。
  if (state.display !== event.source) {
    return { ...state, failedKeys };
  }

  if (event.source === "gebco") {
    return { display: "etopo", failedKeys, notice: null };
  }

  return {
    display: "standard",
    failedKeys,
    notice: BATHYMETRY_STANDARD_NOTICE,
  };
}

export function classifyBathymetryError(input: {
  sourceId?: string;
  message?: string;
}): BathymetryFailureSource | null {
  const sourceId = input.sourceId?.toLowerCase() ?? "";
  const message = input.message?.toLowerCase() ?? "";

  if (
    sourceId.includes("gebco-2026") ||
    message.includes("/bathymetry/gebco-2026") ||
    message.includes("gebco-2026")
  ) {
    return "gebco";
  }

  if (
    sourceId.includes("etopo-2022") ||
    message.includes("/bathymetry/etopo-2022") ||
    message.includes("etopo-2022")
  ) {
    return "etopo";
  }

  return null;
}

export type BathymetryMetadata = {
  dataset?: unknown;
  cropBounds?: unknown;
  width?: unknown;
  height?: unknown;
  nodata?: unknown;
  sourceSha256?: unknown;
};

const EXPECTED_BOUNDS = {
  west: 128.5,
  south: 32.5,
  east: 130.8,
  north: 34,
};

const EXPECTED_GEBCO_SHA =
  "6824253a950edddc9c5c6e47a77eccbaae788b550f7885062aae238143622151";

function sameBounds(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const bounds = value as Record<string, unknown>;
  return Object.entries(EXPECTED_BOUNDS).every(
    ([key, expected]) => bounds[key] === expected,
  );
}

export function validateBathymetryMetadata(
  metadata: BathymetryMetadata,
  source: BathymetryFailureSource,
): string | null {
  if (!sameBounds(metadata.cropBounds)) return "metadata-bounds";

  if (
    typeof metadata.width !== "number" ||
    typeof metadata.height !== "number" ||
    metadata.width <= 0 ||
    metadata.height <= 0
  ) {
    return "metadata-shape";
  }

  const dataset = String(metadata.dataset ?? "");
  if (source === "gebco") {
    if (!dataset.includes("GEBCO_2026")) return "metadata-dataset";
    if (metadata.width !== 552 || metadata.height !== 360) {
      return "metadata-shape";
    }
    if (metadata.nodata !== -32767) return "metadata-nodata";
    if (metadata.sourceSha256 !== EXPECTED_GEBCO_SHA) {
      return "metadata-source-sha";
    }
    return null;
  }

  if (!dataset.toLowerCase().includes("etopo")) return "metadata-dataset";
  return null;
}
