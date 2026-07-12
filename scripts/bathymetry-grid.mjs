export function normalizeCellSize(cellSizeDegrees) {
  const normalized =
    typeof cellSizeDegrees === "number"
      ? { longitude: cellSizeDegrees, latitude: cellSizeDegrees }
      : cellSizeDegrees;

  if (
    !normalized ||
    typeof normalized.longitude !== "number" ||
    typeof normalized.latitude !== "number" ||
    normalized.longitude <= 0 ||
    normalized.latitude <= 0
  ) {
    throw new Error("DEM must include positive cell size metadata");
  }

  return normalized;
}

function snapNearInteger(value) {
  const nearest = Math.round(value);
  return Math.abs(value - nearest) <= 1e-9 ? nearest : value;
}

export function samplePixelCentreGrid(dem, lon, lat) {
  const cellSize = normalizeCellSize(dem.cellSizeDegrees);
  const rawX = (lon - dem.bounds.west) / cellSize.longitude - 0.5;
  const rawY = (dem.bounds.north - lat) / cellSize.latitude - 0.5;
  const gx = snapNearInteger(rawX);
  const gy = snapNearInteger(rawY);
  const x = Math.max(0, Math.min(dem.width - 1, gx));
  const y = Math.max(0, Math.min(dem.height - 1, gy));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(dem.width - 1, x0 + 1);
  const y1 = Math.min(dem.height - 1, y0 + 1);
  const dx = x - x0;
  const dy = y - y0;
  const value = (column, row) => dem.values[row * dem.width + column];

  return (
    value(x0, y0) * (1 - dx) * (1 - dy) +
    value(x1, y0) * dx * (1 - dy) +
    value(x0, y1) * (1 - dx) * dy +
    value(x1, y1) * dx * dy
  );
}

export function gridCellCentre(dem, column, row) {
  const cellSize = normalizeCellSize(dem.cellSizeDegrees);
  return [
    dem.bounds.west + (column + 0.5) * cellSize.longitude,
    dem.bounds.north - (row + 0.5) * cellSize.latitude,
  ];
}

export function encodeTerrainRgb(elevationMeters) {
  const encoded = Math.round((elevationMeters + 10000) * 10);
  return [
    (encoded >> 16) & 255,
    (encoded >> 8) & 255,
    encoded & 255,
    255,
  ];
}

export function decodeTerrainRgb(red, green, blue) {
  return -10000 + (red * 256 * 256 + green * 256 + blue) * 0.1;
}
