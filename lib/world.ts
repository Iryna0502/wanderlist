import type { Bounds } from "./types";

/**
 * Map backdrop exported from Figma.
 *
 * Refresh:
 *   FIGMA_TOKEN=… node scripts/export-figma-map.mjs
 * or drop PNG at public/map_src.png and run node scripts/convert-map.mjs
 */
export const FIGMA_FILE_KEY = "wFblBEwxeHPwglX8lUOYPe";
export const FIGMA_NODE_ID = "3446:1983";

export const MAP_IMAGE_SRC = "/map.webp";

/** WORLD bounds = the map image's natural pixel dimensions (1× export). */
export const WORLD: Bounds = { w: 1024, h: 1024 };
