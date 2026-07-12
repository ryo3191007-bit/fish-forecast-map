#!/usr/bin/env python3
"""Documented placeholder for reproducible ETOPO 2022 crop and tile generation.
Requires GDAL/rio-rgbify in an operator environment; runtime app never executes this.
"""
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--bounds', nargs=4, required=True)
parser.add_argument('--minzoom', type=int, default=7)
parser.add_argument('--maxzoom', type=int, default=10)
parser.add_argument('--output', required=True)
args = parser.parse_args()
print('Fetch ETOPO 2022 GeoTIFF from NOAA, crop with gdal_translate -projwin, then create Terrain-RGB/color tiles into', args.output)
