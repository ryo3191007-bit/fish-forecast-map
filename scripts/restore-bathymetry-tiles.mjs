import fs from "node:fs";
import path from "node:path";

const fixturePath = "data/bathymetry/etopo-2022-sample-tiles.json";
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

for (const file of fixture.files) {
  if (file.encoding !== "base64") {
    throw new Error(
      `Unsupported bathymetry fixture encoding: ${file.encoding}`,
    );
  }
  const outputPath = file.path;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(file.content, "base64"));
  console.log(`restored ${outputPath}`);
}
