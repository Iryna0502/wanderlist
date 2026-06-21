// Encode public/map_src.png as WebP at native resolution.
// Re-run after replacing the source (Figma export or manual PNG).
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const src = "public/map_src.png";
const out = "public/map.webp";

const meta = await sharp(src).metadata();
await sharp(src).webp({ quality: 82, effort: 5 }).toFile(out);

const outMeta = await sharp(out).metadata();
console.log(
  `source ${meta.width}x${meta.height} -> ${out} ${outMeta.width}x${outMeta.height}`,
);

// Hint for lib/world.ts WORLD bounds
const worldTs = readFileSync("lib/world.ts", "utf8");
const updated = worldTs.replace(
  /export const WORLD: Bounds = \{ w: \d+, h: \d+ \};/,
  `export const WORLD: Bounds = { w: ${outMeta.width}, h: ${outMeta.height} };`,
);
if (updated !== worldTs) {
  writeFileSync("lib/world.ts", updated);
  console.log(`Updated lib/world.ts WORLD to ${outMeta.width}x${outMeta.height}`);
}
