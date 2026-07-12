#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

const [,, bathymetryPath, tidPath] = process.argv;
if (!bathymetryPath || !tidPath) {
  console.error("Usage: node tools/bathymetry/convert-gebco-netcdf.mjs <gebco-bathymetry.nc> <gebco-tid.nc>");
  process.exit(1);
}
for (const file of [bathymetryPath, tidPath]) {
  if (!fs.existsSync(file)) throw new Error(`Input not found: ${file}`);
  console.log(`${file}: ${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`);
}
console.log("This lightweight verifier records official NetCDF SHA-256 values. Convert NetCDF to the committed JSON canon with a local NetCDF toolchain, preserving the 552 x 360 pixel-centre cells without interpolation.");
