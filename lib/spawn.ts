import type { Bounds, Goal } from "./types";
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
  goals: Goal[],
  gap = MIN_GAP,
): boolean {
  const g2 = gap * gap;
  for (const g of goals) {
    const dx = g.x - x;
    const dy = g.y - y;
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
 * Pick a land spot on the map, well-spaced from existing goals.
 */
export function pickGoalPosition(
  originX: number,
  originY: number,
  goals: Goal[],
  bounds: Bounds,
): { x: number; y: number } {
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
      farEnough(x, y, goals)
    ) {
      return { x, y };
    }
  }

  for (let attempt = 0; attempt < 400; attempt++) {
    const x = (rand() - 0.5) * (bounds.w - 120);
    const y = (rand() - 0.5) * (bounds.h - 120);
    if (biomeAt(x, y) !== "water" && farEnough(x, y, goals, MIN_GAP * 0.7)) {
      return { x, y };
    }
  }

  return { x: originX + NEAR_MIN, y: originY };
}
