#!/usr/bin/env python3
"""Convert the official GEBCO_2026 bathymetry/TID NetCDF crops to canonical JSON.

The NetCDF files are local inputs only. This tool never downloads data and is not
called by the application runtime or normal Vercel build.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any, Iterable, Sequence

EXPECTED_BOUNDS = {"west": 128.5, "south": 32.5, "east": 130.8, "north": 34.0}
EXPECTED_WIDTH = 552
EXPECTED_HEIGHT = 360
EXPECTED_CELL_SIZE = 1 / 240
EXPECTED_DEM_SHA = "6824253a950edddc9c5c6e47a77eccbaae788b550f7885062aae238143622151"
EXPECTED_TID_SHA = "04462cc4ffeba5b55f7397ce0feebd97a0686ef360395c7286b29bbb852cda84"
EXPECTED_DEM_VALUES_SHA = "59f02c67f79aa3edb61548ddd0dcb669880f6164ccc97eb8dd1a9fbfb0fd244b"
EXPECTED_TID_VALUES_SHA = "f39a3d090f387d124c1b5a10ecfff113f186b5f916ad2cc4001d5bebf2a70688"


def compact_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def values_sha256(values: Sequence[int | float]) -> str:
    return sha256_bytes(compact_json(list(values)).encode("utf-8"))


def _close(left: float, right: float, tolerance: float = 1e-7) -> bool:
    return math.isclose(float(left), float(right), rel_tol=0, abs_tol=tolerance)


def normalize_grid(
    longitudes: Sequence[float],
    latitudes: Sequence[float],
    flat_values: Sequence[int | float],
    *,
    width: int,
    height: int,
    bounds: dict[str, float],
    cell_size: float,
    nodata: int,
) -> tuple[list[int | float], str]:
    if len(longitudes) != width or len(latitudes) != height:
        raise ValueError(
            f"Unexpected coordinate shape: lon={len(longitudes)}, lat={len(latitudes)}, expected={width}x{height}"
        )
    if len(flat_values) != width * height:
        raise ValueError(
            f"Unexpected value count: {len(flat_values)}, expected={width * height}"
        )

    lon_ascending = longitudes[-1] > longitudes[0]
    lat_ascending = latitudes[-1] > latitudes[0]
    west_center = bounds["west"] + cell_size / 2
    east_center = bounds["east"] - cell_size / 2
    south_center = bounds["south"] + cell_size / 2
    north_center = bounds["north"] - cell_size / 2

    actual_west = longitudes[0] if lon_ascending else longitudes[-1]
    actual_east = longitudes[-1] if lon_ascending else longitudes[0]
    actual_south = latitudes[0] if lat_ascending else latitudes[-1]
    actual_north = latitudes[-1] if lat_ascending else latitudes[0]

    for name, actual, expected in (
        ("west pixel centre", actual_west, west_center),
        ("east pixel centre", actual_east, east_center),
        ("south pixel centre", actual_south, south_center),
        ("north pixel centre", actual_north, north_center),
    ):
        if not _close(actual, expected):
            raise ValueError(f"Unexpected {name}: {actual}; expected {expected}")

    rows = [list(flat_values[row * width : (row + 1) * width]) for row in range(height)]
    if lat_ascending:
        rows.reverse()
    if not lon_ascending:
        rows = [list(reversed(row)) for row in rows]

    normalized: list[int | float] = []
    for row in rows:
        for value in row:
            numeric = value.item() if hasattr(value, "item") else value
            if numeric is None or (isinstance(numeric, float) and not math.isfinite(numeric)):
                normalized.append(nodata)
            elif isinstance(numeric, float) and numeric.is_integer():
                normalized.append(int(numeric))
            else:
                normalized.append(numeric)

    orientation = (
        "row-major north-to-south, west-to-east; rows are reversed from the GEBCO "
        "NetCDF latitude variable because the NetCDF crop stores latitude south-to-north"
        if lat_ascending
        else "row-major north-to-south, west-to-east; source latitude already north-to-south"
    )
    return normalized, orientation


def build_payload(
    *,
    values: Sequence[int | float],
    orientation: str,
    source_sha: str,
    dataset: str,
    nodata: int,
    access_date: str,
    is_tid: bool,
) -> dict[str, Any]:
    valid = [value for value in values if value != nodata]
    if not valid:
        raise ValueError("The requested crop contains no valid values")

    payload: dict[str, Any] = {
        "version": "2026",
        "bounds": EXPECTED_BOUNDS,
        "width": EXPECTED_WIDTH,
        "height": EXPECTED_HEIGHT,
        "cellSizeDegrees": {
            "longitude": round(EXPECTED_CELL_SIZE, 12),
            "latitude": round(EXPECTED_CELL_SIZE, 12),
        },
        "orientation": orientation,
        "sourceUrl": "https://download.gebco.net/",
        "license": "GEBCO Terms of Use; attribution required",
        "attribution": "Contains information from the GEBCO_2026 Grid, GEBCO Compilation Group (2026).",
        "disclaimer": "Reference only; not an official nautical chart; must not be used for navigation or safety decisions.",
        "accessDate": access_date,
        "nodata": nodata,
        "sourceSha256": source_sha,
        "dataset": dataset,
        "min": min(valid),
        "max": max(valid),
    }

    if is_tid:
        payload["tidCodes"] = {
            "0": "land",
            "11": "multibeam direct measurement",
            "17": "direct measurement, other source",
            "40": "predicted/interpolated",
            "43": "mixed source",
            "44": "contour/unknown source",
            "127": "nodata",
        }
        payload["classification"] = {
            "direct": [10, 11, 12, 13, 14, 15, 16, 17],
            "predictedInterpolated": [40, 41, 45],
            "mixedUnknownLand": [0, 43, 44, 70, 71, 72],
            "nodata": [127],
        }

    payload["values"] = list(values)
    digest = values_sha256(values)
    payload["valuesSha256"] = digest
    payload["cropSha256"] = digest
    payload["textSha256"] = sha256_bytes(compact_json(payload).encode("utf-8"))
    return payload


def _read_variable(dataset: Any, names: Iterable[str]) -> Any:
    for name in names:
        if name in dataset.variables:
            return dataset.variables[name]
    raise ValueError(f"Missing NetCDF variable; expected one of: {', '.join(names)}")


def _read_netcdf(path: Path, *, is_tid: bool) -> tuple[list[float], list[float], list[Any]]:
    try:
        from netCDF4 import Dataset  # type: ignore
    except ImportError as error:
        raise RuntimeError(
            "Python package netCDF4 is required. Install it with: python -m pip install netCDF4"
        ) from error

    with Dataset(path, "r") as dataset:
        lon_var = _read_variable(dataset, ("lon", "longitude", "x"))
        lat_var = _read_variable(dataset, ("lat", "latitude", "y"))
        value_var = _read_variable(
            dataset,
            ("tid", "sid", "Band1", "z") if is_tid else ("elevation", "z", "Band1"),
        )
        longitudes = [float(value) for value in lon_var[:]]
        latitudes = [float(value) for value in lat_var[:]]
        raw = value_var[:]
        if hasattr(raw, "filled"):
            raw = raw.filled(127 if is_tid else -32767)
        values = list(raw.reshape(-1)) if hasattr(raw, "reshape") else list(raw)
        return longitudes, latitudes, values


def convert_file(
    path: Path,
    *,
    expected_source_sha: str,
    expected_values_sha: str,
    dataset_name: str,
    nodata: int,
    access_date: str,
    is_tid: bool,
) -> dict[str, Any]:
    actual_source_sha = sha256_file(path)
    if actual_source_sha != expected_source_sha:
        raise ValueError(
            f"Unexpected source SHA-256 for {path}: {actual_source_sha}; expected {expected_source_sha}"
        )

    longitudes, latitudes, raw_values = _read_netcdf(path, is_tid=is_tid)
    values, orientation = normalize_grid(
        longitudes,
        latitudes,
        raw_values,
        width=EXPECTED_WIDTH,
        height=EXPECTED_HEIGHT,
        bounds=EXPECTED_BOUNDS,
        cell_size=EXPECTED_CELL_SIZE,
        nodata=nodata,
    )
    actual_values_sha = values_sha256(values)
    if actual_values_sha != expected_values_sha:
        raise ValueError(
            f"Converted value-array SHA-256 mismatch: {actual_values_sha}; expected {expected_values_sha}"
        )

    if is_tid:
        observed = sorted(set(values))
        if observed != [0, 11, 17, 40, 43, 44]:
            raise ValueError(f"Unexpected TID codes: {observed}")

    return build_payload(
        values=values,
        orientation=orientation,
        source_sha=actual_source_sha,
        dataset=dataset_name,
        nodata=nodata,
        access_date=access_date,
        is_tid=is_tid,
    )


def write_payload(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(compact_json(payload), encoding="utf-8")


def run_self_test() -> None:
    bounds = {"west": 0.0, "south": 0.0, "east": 2.0, "north": 2.0}
    normalized, orientation = normalize_grid(
        [0.5, 1.5],
        [0.5, 1.5],
        [1, 2, 3, 4],
        width=2,
        height=2,
        bounds=bounds,
        cell_size=1.0,
        nodata=-999,
    )
    assert normalized == [3, 4, 1, 2]
    assert "reversed" in orientation
    assert values_sha256([1, 2, 3]) == sha256_bytes(b"[1,2,3]")
    print("GEBCO converter self-test passed")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("dem", nargs="?", type=Path)
    parser.add_argument("tid", nargs="?", type=Path)
    parser.add_argument("--access-date", default="2026-07-12")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return 0
    if args.dem is None or args.tid is None:
        parser.error("DEM and TID NetCDF paths are required")

    dem_payload = convert_file(
        args.dem,
        expected_source_sha=EXPECTED_DEM_SHA,
        expected_values_sha=EXPECTED_DEM_VALUES_SHA,
        dataset_name="GEBCO_2026 Grid",
        nodata=-32767,
        access_date=args.access_date,
        is_tid=False,
    )
    tid_payload = convert_file(
        args.tid,
        expected_source_sha=EXPECTED_TID_SHA,
        expected_values_sha=EXPECTED_TID_VALUES_SHA,
        dataset_name="GEBCO_2026 TID Grid",
        nodata=127,
        access_date=args.access_date,
        is_tid=True,
    )

    write_payload(Path("data/bathymetry/gebco-2026-crop.json"), dem_payload)
    write_payload(Path("data/bathymetry/gebco-2026-tid-crop.json"), tid_payload)
    print("Wrote canonical GEBCO_2026 DEM/TID JSON files")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # noqa: BLE001 - CLI must print a concise actionable failure
        print(f"GEBCO conversion failed: {error}", file=sys.stderr)
        raise SystemExit(1)
