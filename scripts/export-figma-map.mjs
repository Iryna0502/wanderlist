/**
 * Export the map backdrop from Figma → public/map.webp
 *
 * Usage:
 *   FIGMA_TOKEN=your_personal_access_token node scripts/export-figma-map.mjs
 *
 * Get a token: Figma → Settings → Security → Personal access tokens
 */
import { writeFileSync, readFileSync } from "node:fs";
import sharp from "sharp";

const FIGMA_FILE_KEY = "wFblBEwxeHPwglX8lUOYPe";
const FIGMA_NODE_ID = "3446:1983";

const token = process.env.FIGMA_TOKEN || process.env.FIGMA_ACCESS_TOKEN;
if (!token) {
  console.error(
    "Missing FIGMA_TOKEN. Create one in Figma → Settings → Security → Personal access tokens.",
  );
  process.exit(1);
}

const ids = encodeURIComponent(FIGMA_NODE_ID);
const imagesUrl = `https://api.figma.com/v1/images/${FIGMA_FILE_KEY}?ids=${ids}&format=png&scale=2`;

const imagesRes = await fetch(imagesUrl, {
  headers: { "X-Figma-Token": token },
});
if (!imagesRes.ok) {
  console.error("Figma images API failed:", imagesRes.status, await imagesRes.text());
  process.exit(1);
}

const imagesJson = await imagesRes.json();
const pngUrl = imagesJson.images?.[FIGMA_NODE_ID];
if (!pngUrl) {
  console.error("No export URL in response:", imagesJson);
  process.exit(1);
}

const pngRes = await fetch(pngUrl);
if (!pngRes.ok) {
  console.error("Download failed:", pngRes.status);
  process.exit(1);
}

const pngBuf = Buffer.from(await pngRes.arrayBuffer());
writeFileSync("public/map_src.png", pngBuf);

const meta = await sharp(pngBuf).metadata();
const nativeW = Math.round((meta.width ?? 0) / 2);
const webpPath = "public/map.webp";

await sharp(pngBuf)
  .resize({ width: nativeW })
  .webp({ quality: 82, effort: 5 })
  .toFile(webpPath);

const out = await sharp(webpPath).metadata();
console.log(
  `Figma ${FIGMA_NODE_ID} @2x ${meta.width}x${meta.height} -> ${webpPath} ${out.width}x${out.height}`,
);

const worldTs = readFileSync("lib/world.ts", "utf8");
const updated = worldTs.replace(
  /export const WORLD: Bounds = \{ w: \d+, h: \d+ \};/,
  `export const WORLD: Bounds = { w: ${out.width}, h: ${out.height} };`,
);
if (updated !== worldTs) {
  writeFileSync("lib/world.ts", updated);
  console.log(`Updated lib/world.ts WORLD to ${out.width}x${out.height}`);
}
