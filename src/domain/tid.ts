export type TidGrid = { width: number; height: number; bounds: { west: number; south: number; east: number; north: number }; nodata: number; values: number[] };
export type TidSummary = { status: "ok" | "out-of-bounds" | "nodata-only" | "error"; codes: Record<string, number>; centerCode: number | null };

export const REPRESENTATIVE_TID_POINTS = [
  { name: "芥屋大門", coordinates: [130.109, 33.596] as const },
  { name: "唐津東港", coordinates: [129.993, 33.459] as const },
  { name: "呼子", coordinates: [129.892, 33.543] as const },
  { name: "鷹島", coordinates: [129.844, 33.448] as const },
  { name: "平戸瀬戸", coordinates: [129.579, 33.354] as const },
] as const;

export function summarizeTidAt(grid: TidGrid | null, lon: number, lat: number, radius = 8): TidSummary {
  if (!grid) return { status: "error", codes: {}, centerCode: null };
  const { west, east, north, south } = grid.bounds;
  if (lon < west || lon > east || lat < south || lat > north) return { status: "out-of-bounds", codes: {}, centerCode: null };
  const col = Math.round(((lon - west) / (east - west)) * (grid.width - 1));
  const row = Math.round(((north - lat) / (north - south)) * (grid.height - 1));
  const codes: Record<string, number> = {};
  let centerCode: number | null = null;
  for (let y = Math.max(0, row - radius); y <= Math.min(grid.height - 1, row + radius); y++) {
    for (let x = Math.max(0, col - radius); x <= Math.min(grid.width - 1, col + radius); x++) {
      const code = grid.values[y * grid.width + x];
      if (x === col && y === row && code !== grid.nodata) centerCode = code;
      if (code === grid.nodata) continue;
      codes[String(code)] = (codes[String(code)] ?? 0) + 1;
    }
  }
  return Object.keys(codes).length ? { status: "ok", codes, centerCode } : { status: "nodata-only", codes, centerCode: null };
}
