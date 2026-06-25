import type { Bounds } from "./types";

/** Keep markers inside the illustrated map, away from the image edge. */
export const MAP_EDGE_PAD = 96;

/**
 * Landmark positions (fractions of half-extent, −1…1).
 * Tuned to paths and features on the map illustration.
 */
export const GOAL_SPOTS: Array<[number, number]> = [
  [0, 0.02],
  [0.04, -0.44],
  [-0.5, 0.44],
  [0.36, -0.38],
  [-0.42, -0.12],
  [0.38, 0.08],
  [0.28, 0.4],
  [0.12, -0.58],
  [0.22, 0.32],
  [-0.28, 0.18],
  [0.48, 0.22],
  [-0.12, -0.38],
  [0.08, 0.52],
  [-0.55, -0.35],
];

/** World xy from fractional map coordinates, clamped inside the image. */
export function spotXY(
  fx: number,
  fy: number,
  bounds: Bounds,
  pad = MAP_EDGE_PAD,
): { x: number; y: number } {
  const hx = bounds.w / 2 - pad;
  const hy = bounds.h / 2 - pad;
  return {
    x: Math.max(-hx, Math.min(hx, fx * hx)),
    y: Math.max(-hy, Math.min(hy, fy * hy)),
  };
}

export function goalInBounds(
  x: number,
  y: number,
  bounds: Bounds,
  pad = MAP_EDGE_PAD,
): boolean {
  return (
    x >= -bounds.w / 2 + pad &&
    x <= bounds.w / 2 - pad &&
    y >= -bounds.h / 2 + pad &&
    y <= bounds.h / 2 - pad
  );
}

export function clampGoalPosition(
  x: number,
  y: number,
  bounds: Bounds,
  pad = MAP_EDGE_PAD,
): { x: number; y: number } {
  const hx = bounds.w / 2 - pad;
  const hy = bounds.h / 2 - pad;
  return {
    x: Math.max(-hx, Math.min(hx, x)),
    y: Math.max(-hy, Math.min(hy, y)),
  };
}
