import type { Bounds, FogSpot, Place } from "./types";
import { biomeAt } from "./biome";
import { rng } from "./noise";

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

/** Minimum spacing so markers never overlap (world units). */
const MIN_GAP = 150;
const NEAR_MIN = 230;
const NEAR_MAX = 520;

function farEnough(
  x: number,
  y: number,
  places: Place[],
  fog: FogSpot[],
  gap = MIN_GAP,
): boolean {
  const g2 = gap * gap;
  for (const p of places) {
    const dx = p.x - x;
    const dy = p.y - y;
    if (dx * dx + dy * dy < g2) return false;
  }
  for (const f of fog) {
    const dx = f.x - x;
    const dy = f.y - y;
    if (dx * dx + dy * dy < g2) return false;
  }
  return true;
}

function inBounds(x: number, y: number, bounds: Bounds, pad = 60): boolean {
  return (
    x > -bounds.w / 2 + pad &&
    x < bounds.w / 2 - pad &&
    y > -bounds.h / 2 + pad &&
    y < bounds.h / 2 - pad
  );
}

/**
 * THE RULE: after claiming a place, a new fog spot rises somewhere nearby in
 * unexplored space — but the map is finite, so the spot must stay within bounds.
 * We search outward from the origin for a spot that is on land, well-spaced, and
 * inside the map; if the neighbourhood is full we fall back to any free land cell.
 */
export function spawnNearbyFog(
  originX: number,
  originY: number,
  places: Place[],
  fog: FogSpot[],
  bounds: Bounds,
): FogSpot {
  const seed = (Math.floor(originX) * 73856093) ^ (Math.floor(originY) * 19349663);
  const rand = rng(seed >>> 0);

  for (let attempt = 0; attempt < 80; attempt++) {
    const angle = rand() * Math.PI * 2;
    const dist = NEAR_MIN + rand() * (NEAR_MAX - NEAR_MIN) + attempt * 4;
    const x = originX + Math.cos(angle) * dist;
    const y = originY + Math.sin(angle) * dist;
    if (
      inBounds(x, y, bounds) &&
      biomeAt(x, y) !== "water" &&
      farEnough(x, y, places, fog)
    ) {
      return { id: uid(), x, y };
    }
  }

  // Map neighbourhood is crowded — scan the whole finite map for any free land.
  for (let attempt = 0; attempt < 400; attempt++) {
    const x = (rand() - 0.5) * (bounds.w - 120);
    const y = (rand() - 0.5) * (bounds.h - 120);
    if (biomeAt(x, y) !== "water" && farEnough(x, y, places, fog, MIN_GAP * 0.7)) {
      return { id: uid(), x, y };
    }
  }

  return { id: uid(), x: originX + NEAR_MIN, y: originY };
}
