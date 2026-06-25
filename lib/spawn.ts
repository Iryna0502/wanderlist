import type { Bounds, Goal } from "./types";
import {
  GOAL_SPOTS,
  MAP_EDGE_PAD,
  clampGoalPosition,
  goalInBounds,
  spotXY,
} from "./goalSpots";
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

function pickFromSpots(
  goals: Goal[],
  bounds: Bounds,
  startIndex: number,
): { x: number; y: number } | null {
  for (let i = 0; i < GOAL_SPOTS.length; i++) {
    const idx = (startIndex + i) % GOAL_SPOTS.length;
    const [fx, fy] = GOAL_SPOTS[idx];
    const { x, y } = spotXY(fx, fy, bounds);
    if (farEnough(x, y, goals)) return { x, y };
  }
  return null;
}

/**
 * Pick a spot on the static map, well-spaced from existing goals.
 * Always returns coordinates inside the map image.
 */
export function pickGoalPosition(
  originX: number,
  originY: number,
  goals: Goal[],
  bounds: Bounds,
): { x: number; y: number } {
  const fromSpots = pickFromSpots(goals, bounds, goals.length);
  if (fromSpots) return fromSpots;

  const seed = (Math.floor(originX) * 73856093) ^ (Math.floor(originY) * 19349663);
  const rand = rng(seed >>> 0);

  for (let attempt = 0; attempt < 80; attempt++) {
    const angle = rand() * Math.PI * 2;
    const dist = NEAR_MIN + rand() * (NEAR_MAX - NEAR_MIN) + attempt * 4;
    const x = originX + Math.cos(angle) * dist;
    const y = originY + Math.sin(angle) * dist;
    if (goalInBounds(x, y, bounds) && farEnough(x, y, goals)) {
      return clampGoalPosition(x, y, bounds);
    }
  }

  const spanX = bounds.w - MAP_EDGE_PAD * 2;
  const spanY = bounds.h - MAP_EDGE_PAD * 2;
  for (let attempt = 0; attempt < 200; attempt++) {
    const x = (rand() - 0.5) * spanX;
    const y = (rand() - 0.5) * spanY;
    if (farEnough(x, y, goals, MIN_GAP * 0.7)) {
      return clampGoalPosition(x, y, bounds);
    }
  }

  const [fx, fy] = GOAL_SPOTS[goals.length % GOAL_SPOTS.length];
  return spotXY(fx, fy, bounds);
}
