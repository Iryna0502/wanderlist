import type { Biome } from "./types";
import { fbm } from "./noise";

/** Size of one terrain tile in world units. */
export const TILE = 240;

/**
 * Continuous biome field. We sample two low-frequency fractal-noise fields —
 * elevation and moisture — at the given WORLD coordinate, then map the pair to a
 * biome. Low frequency => big, coherent regions (oceans, forests) rather than
 * noise. Because it's a pure function of position, it's infinite + deterministic.
 */
const ELEV_SCALE = 0.0016;
const MOIST_SCALE = 0.0021;

export function elevationAt(wx: number, wy: number): number {
  return fbm(wx * ELEV_SCALE, wy * ELEV_SCALE, 4, 5);
}

export function moistureAt(wx: number, wy: number): number {
  return fbm(wx * MOIST_SCALE + 1000, wy * MOIST_SCALE - 1000, 3, 99);
}

export function biomeAt(wx: number, wy: number): Biome {
  const e = elevationAt(wx, wy);
  const m = moistureAt(wx, wy);

  if (e < 0.4) return "water";
  if (e > 0.78) return "peaks";
  if (e > 0.62) return "hills";
  if (m > 0.52) return "forest";
  return "meadow";
}

/** Biome at the CENTER of a tile (used for decoration + base fill). */
export function biomeOfTile(tx: number, ty: number): Biome {
  return biomeAt(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
}

export interface BiomePalette {
  base: string;
  baseHi: string;
  baseLo: string;
  detail: string;
}

export const PALETTE: Record<Biome, BiomePalette> = {
  water: { base: "#7bb3ad", baseHi: "#94c6c0", baseLo: "#5f9a95", detail: "#bfe0db" },
  meadow: { base: "#bcc77e", baseHi: "#cdd793", baseLo: "#a3b066", detail: "#e6d98a" },
  forest: { base: "#8aa86a", baseHi: "#9cb87b", baseLo: "#6f8d53", detail: "#5d7a45" },
  hills: { base: "#c2b783", baseHi: "#d2c896", baseLo: "#a99c66", detail: "#8a7c50" },
  peaks: { base: "#bfb59c", baseHi: "#d9d2c0", baseLo: "#9f937a", detail: "#fbfbff" },
};
