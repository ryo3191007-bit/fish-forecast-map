#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "convert_gebco_netcdf.py",
);

const candidates =
  process.platform === "win32"
    ? [
        { command: "py", prefix: ["-3"] },
        { command: "python", prefix: [] },
        { command: "python3", prefix: [] },
      ]
    : [
        { command: "python3", prefix: [] },
        { command: "python", prefix: [] },
      ];

let lastError = null;
for (const candidate of candidates) {
  const result = spawnSync(
    candidate.command,
    [...candidate.prefix, script, ...process.argv.slice(2)],
    { encoding: "utf8" },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (!result.error || result.error.code !== "ENOENT") {
    process.exit(result.status ?? 1);
  }
  lastError = result.error;
}

console.error(
  "Python 3 was not found. Install Python 3, then run this command again.",
  lastError ?? "",
);
process.exit(1);
