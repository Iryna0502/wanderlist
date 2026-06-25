"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { Bounds, Camera, Goal } from "@/lib/types";
import {
  type Viewport,
  clampCamera,
  clampZoom,
  coverZoom,
  screenToWorld,
  worldToScreen,
} from "@/lib/camera";
import {
  drawBackdrop,
  drawDynamic,
  lockedMarkerLayout,
  placeMarkerLayout,
} from "@/lib/render";
import { MAP_IMAGE_SRC } from "@/lib/world";

/** Screen pixels of rubber-band slack allowed past the map edge while dragging. */
const MAX_OVERSCROLL = 80;

function rubberBand(
  cam: Camera,
  vp: Viewport,
  bounds: Bounds,
  dragging: boolean,
): Camera {
  const hard = clampCamera(cam, vp, bounds);
  if (dragging) {
    const slack = MAX_OVERSCROLL / hard.zoom;
    const damp = (pos: number, target: number) => {
      const d = pos - target;
      if (d === 0) return target;
      return target + Math.sign(d) * Math.min(slack, Math.abs(d)) * 0.55;
    };
    return { zoom: hard.zoom, x: damp(cam.x, hard.x), y: damp(cam.y, hard.y) };
  }
  const k = 0.22;
  return {
    zoom: hard.zoom,
    x: hard.x + (cam.x - hard.x) * (1 - k),
    y: hard.y + (cam.y - hard.y) * (1 - k),
  };
}

export interface MapHandle {
  flyTo: (x: number, y: number, zoom?: number) => void;
  jumpTo: (x: number, y: number, zoom?: number) => void;
  zoomBy: (factor: number) => void;
}

interface Props {
  goals: Goal[];
  bounds: Bounds;
  activeId?: string;
  reduced: boolean;
  onTapLocked: (goal: Goal) => void;
  onTapUnlocked: (goal: Goal) => void;
}

interface PointerInfo {
  x: number;
  y: number;
}

const FLY_MS = 750;

const MapCanvas = forwardRef<MapHandle, Props>(function MapCanvas(
  { goals, bounds, activeId, reduced, onTapLocked, onTapUnlocked },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const vpRef = useRef<Viewport>({ width: 0, height: 0, dpr: 1 });
  const goalsRef = useRef(goals);
  const boundsRef = useRef(bounds);
  const activeIdRef = useRef(activeId);
  const reducedRef = useRef(reduced);
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const photosRef = useRef<Map<string, ImageBitmap>>(new Map());

  const pointers = useRef<Map<number, PointerInfo>>(new Map());
  const pinchDist = useRef<number | null>(null);
  const pinchMid = useRef<{ x: number; y: number } | null>(null);
  const downAt = useRef<{ x: number; y: number; t: number } | null>(null);
  const moved = useRef(false);

  const anim = useRef<{
    from: Camera;
    to: Camera;
    start: number;
    active: boolean;
  }>({ from: camRef.current, to: camRef.current, start: 0, active: false });

  goalsRef.current = goals;
  boundsRef.current = bounds;
  activeIdRef.current = activeId;
  reducedRef.current = reduced;

  useImperativeHandle(ref, () => ({
    flyTo(x, y, zoom) {
      const cam = camRef.current;
      const to: Camera = { x, y, zoom: zoom ?? cam.zoom };
      if (reducedRef.current) {
        camRef.current = to;
        return;
      }
      anim.current = { from: { ...cam }, to, start: performance.now(), active: true };
    },
    jumpTo(x, y, zoom) {
      camRef.current = { x, y, zoom: zoom ?? camRef.current.zoom };
      anim.current.active = false;
    },
    zoomBy(factor) {
      const vp = vpRef.current;
      zoomAt(vp.width / 2, vp.height / 2, factor);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const prevVp = { ...vpRef.current };
      const prevFit = coverZoom(prevVp, boundsRef.current);
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      vpRef.current = { width: w, height: h, dpr };
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cam = camRef.current;
      const atCover = cam.zoom <= prevFit * 1.001;
      const newFit = coverZoom(vpRef.current, boundsRef.current);
      if (atCover) {
        camRef.current = clampCamera({ x: 0, y: 0, zoom: newFit }, vpRef.current, boundsRef.current);
      } else {
        camRef.current = clampCamera(
          { ...cam, zoom: cam.zoom * (newFit / prevFit) },
          vpRef.current,
          boundsRef.current,
        );
      }
      anim.current.active = false;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    };
  }, []);

  useEffect(() => {
    const vp = vpRef.current;
    camRef.current = clampCamera(
      { x: 0, y: 0, zoom: coverZoom(vp, bounds) },
      vp,
      bounds,
    );
    anim.current.active = false;
  }, [bounds]);

  useEffect(() => {
    let cancelled = false;
    fetch(MAP_IMAGE_SRC)
      .then((r) => r.blob())
      .then((b) => createImageBitmap(b))
      .then((image) => {
        if (cancelled) {
          image.close?.();
          return;
        }
        bitmapRef.current = image;
      })
      .catch((err) => console.error("Failed to load map image", err));
    return () => {
      cancelled = true;
      bitmapRef.current?.close?.();
      bitmapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cache = photosRef.current;
    const ids = new Set(
      goals.filter((g) => g.status === "unlocked").map((g) => g.id),
    );
    for (const g of goals) {
      if (g.status === "unlocked" && g.photo && !cache.has(g.id)) {
        createImageBitmap(g.photo)
          .then((bm) => {
            if (cancelled) bm.close?.();
            else cache.set(g.id, bm);
          })
          .catch(() => {});
      }
    }
    for (const id of Array.from(cache.keys())) {
      if (!ids.has(id)) {
        cache.get(id)?.close?.();
        cache.delete(id);
      }
    }
    return () => {
      cancelled = true;
    };
  }, [goals]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = 0;
    let raf = 0;
    const loop = (t: number) => {
      if (document.hidden) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (t - lastTime < 24) {
        raf = requestAnimationFrame(loop);
        return;
      }
      lastTime = t;

      const a = anim.current;
      if (a.active) {
        const p = Math.min(1, (t - a.start) / FLY_MS);
        const e = 1 - Math.pow(1 - p, 3);
        camRef.current = {
          x: a.from.x + (a.to.x - a.from.x) * e,
          y: a.from.y + (a.to.y - a.from.y) * e,
          zoom: a.from.zoom + (a.to.zoom - a.from.zoom) * e,
        };
        if (p >= 1) a.active = false;
      }

      const vp = vpRef.current;
      const bounds = boundsRef.current;
      if (a.active) {
        camRef.current = clampCamera(camRef.current, vp, bounds);
      } else {
        camRef.current = rubberBand(
          camRef.current,
          vp,
          bounds,
          pointers.current.size > 0,
        );
      }
      const cam = camRef.current;
      const dpr = vp.dpr;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e3d2ad";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bm = bitmapRef.current;
      if (bm) drawBackdrop(ctx, bm, cam, vp, bounds);

      drawDynamic(ctx, {
        cam,
        vp,
        time: t,
        now: Date.now(),
        goals: goalsRef.current,
        photos: photosRef.current,
        activeId: activeIdRef.current,
        reduced: reducedRef.current,
      });

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const localPoint = (e: PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const zoomAt = useCallback((sx: number, sy: number, factor: number) => {
    const cam = camRef.current;
    const vp = vpRef.current;
    const before = screenToWorld(sx, sy, cam, vp);
    const zoom = clampZoom(cam.zoom * factor);
    camRef.current = {
      zoom,
      x: before.x - (sx - vp.width / 2) / zoom,
      y: before.y - (sy - vp.height / 2) / zoom,
    };
  }, []);

  const hitTest = useCallback((sx: number, sy: number) => {
    const cam = camRef.current;
    const vp = vpRef.current;
    const { cardW, cardH, campS, polaroidOffsetY } = placeMarkerLayout(cam.zoom);
    const { lockW, fs, labelH, labelMaxW } = lockedMarkerLayout(cam.zoom);

    const ordered = [...goalsRef.current].sort(
      (a, b) =>
        worldToScreen(b.x, b.y, cam, vp).y - worldToScreen(a.x, a.y, cam, vp).y,
    );

    for (const g of ordered) {
      const s = worldToScreen(g.x, g.y, cam, vp);

      if (g.status === "locked") {
        const half = lockW * 0.5;
        if (Math.abs(s.x - sx) <= half && Math.abs(s.y - sy) <= half) {
          return { type: "locked" as const, goal: g };
        }
        // Title plaque below the lock (matches drawLockedMarker layout).
        const plaqueY = s.y + lockW * 0.52 + 4;
        const plaqueW = labelMaxW + fs * 0.9;
        if (
          sx >= s.x - plaqueW / 2 &&
          sx <= s.x + plaqueW / 2 &&
          sy >= plaqueY &&
          sy <= plaqueY + labelH
        ) {
          return { type: "locked" as const, goal: g };
        }
        continue;
      }

      const py = s.y - polaroidOffsetY();
      if (
        Math.abs(s.x - sx) < cardW * 0.55 &&
        Math.abs(py - sy) < cardH * 0.62
      ) {
        return { type: "unlocked" as const, goal: g };
      }
      if (
        Math.abs(s.x - sx) < campS * 1.1 &&
        Math.abs(s.y - sy) < campS * 1.1
      ) {
        return { type: "unlocked" as const, goal: g };
      }
    }
    return null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: PointerEvent) => {
      anim.current.active = false;
      canvas.setPointerCapture(e.pointerId);
      const pt = localPoint(e);
      pointers.current.set(e.pointerId, pt);
      if (pointers.current.size === 1) {
        downAt.current = { x: pt.x, y: pt.y, t: performance.now() };
        moved.current = false;
      } else if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
        pinchMid.current = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      const pt = localPoint(e);
      const prev = pointers.current.get(e.pointerId)!;
      pointers.current.set(e.pointerId, pt);

      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (pinchDist.current && pinchMid.current) {
          zoomAt(mid.x, mid.y, dist / pinchDist.current);
          const cam = camRef.current;
          cam.x -= (mid.x - pinchMid.current.x) / cam.zoom;
          cam.y -= (mid.y - pinchMid.current.y) / cam.zoom;
        }
        pinchDist.current = dist;
        pinchMid.current = mid;
        moved.current = true;
        return;
      }

      const cam = camRef.current;
      const dx = pt.x - prev.x;
      const dy = pt.y - prev.y;
      cam.x -= dx / cam.zoom;
      cam.y -= dy / cam.zoom;
      if (downAt.current) {
        const md = Math.hypot(pt.x - downAt.current.x, pt.y - downAt.current.y);
        if (md > 6) moved.current = true;
      }
    };

    const onUp = (e: PointerEvent) => {
      const wasTap =
        pointers.current.size === 1 &&
        !moved.current &&
        downAt.current &&
        performance.now() - downAt.current.t < 500;
      const pt = localPoint(e);
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) {
        pinchDist.current = null;
        pinchMid.current = null;
      }
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);

      if (wasTap) {
        const hit = hitTest(pt.x, pt.y);
        if (hit?.type === "locked") onTapLocked(hit.goal);
        else if (hit?.type === "unlocked") onTapUnlocked(hit.goal);
      }
      downAt.current = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [hitTest, onTapLocked, onTapUnlocked, zoomAt]);

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full touch-none select-none"
      aria-label="Explorable map of your experiences and memories"
    />
  );
});

export default MapCanvas;
