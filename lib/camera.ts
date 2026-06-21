import type { Bounds, Camera } from "./types";

export interface Viewport {
  width: number;
  height: number;
  dpr: number;
}

/** Max zoom ≈ 1.5× the image's native pixels (beyond this it gets blurry). */
export const ZOOM_MAX = 1.5;

export function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, z);
}

/** Smallest zoom at which the map image still fully covers the viewport. */
export function coverZoom(vp: Viewport, bounds: Bounds): number {
  if (!vp.width || !vp.height) return 1;
  return Math.max(vp.width / bounds.w, vp.height / bounds.h);
}

/**
 * Keep the camera inside the map: zoom can't go below "cover the viewport", and
 * panning is clamped so the image edge never scrolls inside the viewport.
 */
export function clampCamera(cam: Camera, vp: Viewport, bounds: Bounds): Camera {
  const minZoom = coverZoom(vp, bounds);
  const zoom = Math.min(ZOOM_MAX, Math.max(minZoom, cam.zoom));

  const halfVW = vp.width / 2 / zoom;
  const halfVH = vp.height / 2 / zoom;
  const hx = bounds.w / 2;
  const hy = bounds.h / 2;

  const minX = -hx + halfVW;
  const maxX = hx - halfVW;
  const minY = -hy + halfVH;
  const maxY = hy - halfVH;

  const x = minX > maxX ? 0 : Math.min(maxX, Math.max(minX, cam.x));
  const y = minY > maxY ? 0 : Math.min(maxY, Math.max(minY, cam.y));
  return { x, y, zoom };
}

/** World point → CSS pixel point (relative to the canvas top-left). */
export function worldToScreen(
  wx: number,
  wy: number,
  cam: Camera,
  vp: Viewport,
): { x: number; y: number } {
  return {
    x: (wx - cam.x) * cam.zoom + vp.width / 2,
    y: (wy - cam.y) * cam.zoom + vp.height / 2,
  };
}

/** CSS pixel point → world point. */
export function screenToWorld(
  sx: number,
  sy: number,
  cam: Camera,
  vp: Viewport,
): { x: number; y: number } {
  return {
    x: (sx - vp.width / 2) / cam.zoom + cam.x,
    y: (sy - vp.height / 2) / cam.zoom + cam.y,
  };
}

/** World-space rectangle currently visible, with a padding margin (world units). */
export function visibleWorldBounds(cam: Camera, vp: Viewport, pad = 0) {
  const halfW = vp.width / 2 / cam.zoom;
  const halfH = vp.height / 2 / cam.zoom;
  return {
    minX: cam.x - halfW - pad,
    maxX: cam.x + halfW + pad,
    minY: cam.y - halfH - pad,
    maxY: cam.y + halfH + pad,
  };
}
