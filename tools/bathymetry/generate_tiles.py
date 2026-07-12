#!/usr/bin/env python3
"""Compatibility wrapper for bathymetry asset generation.

The production build pipeline uses the Node.js generator because it runs from the
committed text DEM without GDAL/rasterio or NOAA network access.
"""
import subprocess
import sys

if __name__ == "__main__":
    raise SystemExit(subprocess.call(["node", "scripts/generate-bathymetry-assets.mjs", *sys.argv[1:]]))
