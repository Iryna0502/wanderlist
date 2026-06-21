"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { Bounds, Camera, FogSpot, Place } from "@/lib/types";
import {
  type Viewport,
  clampCamera,
  clampZoom,
  coverZoom,
  screenToWorld,
  worldToScreen,
} from "@/lib/camera";
import { drawBackdrop, drawDynamic, placeMarkerLayout } from "@/lib/render";
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
  // Released: ease back inside the bounds.
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
  focusNearestFog: () => void;
}

interface Props {
  places: Place[];
  fog: FogSpot[];
  bounds: Bounds;
  activeId?: string;
  reduced: boolean;
  onTapFog: (spot: FogSpot) => void;
  onTapPlace: (place: Place) => void;
}

interface PointerInfo {
  x: number;
  y: number;
}

const FLY_MS = 750;

const MapCanvas = forwardRef<MapHandle, Props>(function MapCanvas(
  { places, fog, bounds, activeId, reduced, onTapFog, onTapPlace },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const vpRef = useRef<Viewport>({ width: 0, height: 0, dpr: 1 });
  const placesRef = useRef(places);
  const fogRef = useRef(fog);
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

  placesRef.current = places;
  fogRef.current = fog;
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
    focusNearestFog() {
      const cam = camRef.current;
      const list = fogRef.current;
      if (!list.length) return;
      let best = list[0];
      let bestD = Infinity;
      for (const f of list) {
        const d = (f.x - cam.x) ** 2 + (f.y - cam.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = f;
        }
      }
      const to: Camera = { x: best.x, y: best.y, zoom: Math.max(cam.zoom, 1) };
      if (reducedRef.current) camRef.current = to;
      else
        anim.current = {
          from: { ...cam },
          to,
          start: performance.now(),
          active: true,
        };
      onTapFog(best);
    },
  }));

  // Resize / DPR handling.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      vpRef.current = { width: w, height: h, dpr };
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Center the map and fit it to cover the window whenever its size changes.
  useEffect(() => {
    const vp = vpRef.current;
    camRef.current = clampCamera(
      { x: 0, y: 0, zoom: coverZoom(vp, bounds) },
      vp,
      bounds,
    );
    anim.current.active = false;
  }, [bounds]);

  // Load the static map image once as an opaque backdrop.
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

  // Decode place photos to bitmaps for drawing as polaroids on the canvas.
  useEffect(() => {
    let cancelled = false;
    const cache = photosRef.current;
    const ids = new Set(places.map((p) => p.id));
    for (const p of places) {
      if (p.photo && !cache.has(p.id)) {
        createImageBitmap(p.photo)
          .then((bm) => {
            if (cancelled) bm.close?.();
            else cache.set(p.id, bm);
          })
          .catch(() => {});
      }
    }
    // Drop bitmaps for removed places.
    for (const id of Array.from(cache.keys())) {
      if (!ids.has(id)) {
        cache.get(id)?.close?.();
        cache.delete(id);
      }
    }
    return () => {
      cancelled = true;
    };
  }, [places]);

  // Render loop: static backdrop image + cheap animated marker layer on top.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = 0;
    let raf = 0;
    const loop = (t: number) => {
      // Pause entirely when the tab is hidden.
      if (document.hidden) {
        raf = requestAnimationFrame(loop);
        return;
      }
      // Throttle to ~40fps — plenty smooth, big battery/heat win.
      if (t - lastTime < 24) {
        raf = requestAnimationFrame(loop);
        return;
      }
      lastTime = t;

      // Camera fly animation.
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
        // Rubber-band: soft overscroll while dragging, ease back when released.
        camRef.current = rubberBand(
          camRef.current,
          vp,
          bounds,
          pointers.current.size > 0,
        );
      }
      const cam = camRef.current;
      const dpr = vp.dpr;

      // Static map backdrop (single drawImage of the visible region).
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e3d2ad"; // parchment shows through any rubber-band gap
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bm = bitmapRef.current;
      if (bm) drawBackdrop(ctx, bm, cam, vp, bounds);

      // Cheap animated marker layer.
      drawDynamic(ctx, {
        cam,
        vp,
        time: t,
        now: Date.now(),
        places: placesRef.current,
        fog: fogRef.current,
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
    // Place markers first (drawn on top). Hit polaroid or campsite.
    for (let i = placesRef.current.length - 1; i >= 0; i--) {
      const p = placesRef.current[i];
      const s = worldToScreen(p.x, p.y, cam, vp);
      const py = s.y - polaroidOffsetY();
      if (
        Math.abs(s.x - sx) < cardW * 0.55 &&
        Math.abs(py - sy) < cardH * 0.62
      )
        return { type: "place" as const, place: p };
      if (
        Math.abs(s.x - sx) < campS * 1.1 &&
        Math.abs(s.y - sy) < campS * 1.1
      )
        return { type: "place" as const, place: p };
    }
    const lockW = Math.max(34, Math.min(70, 52 * cam.zoom));
    for (let i = fogRef.current.length - 1; i >= 0; i--) {
      const f = fogRef.current[i];
      if (
        placesRef.current.some(
          (p) => (p.x - f.x) ** 2 + (p.y - f.y) ** 2 < 80 ** 2,
        )
      )
        continue;
      const s = worldToScreen(f.x, f.y, cam, vp);
      const dx = s.x - sx;
      const dy = s.y - sy;
      const r = lockW * 0.8;
      if (dx * dx + dy * dy < r * r) return { type: "fog" as const, fog: f };
    }
    return null;
  }, []);

  // Pointer / gesture handlers.
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
          // Zoom around the pinch midpoint.
          zoomAt(mid.x, mid.y, dist / pinchDist.current);
          // Pan with the midpoint drift.
          const cam = camRef.current;
          cam.x -= (mid.x - pinchMid.current.x) / cam.zoom;
          cam.y -= (mid.y - pinchMid.current.y) / cam.zoom;
        }
        pinchDist.current = dist;
        pinchMid.current = mid;
        moved.current = true;
        return;
      }

      // Single-pointer drag → pan.
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
        if (hit?.type === "place") onTapPlace(hit.place);
        else if (hit?.type === "fog") onTapFog(hit.fog);
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
  }, [hitTest, onTapFog, onTapPlace, zoomAt]);

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full touch-none select-none"
      aria-label="Explorable map of your discovered places"
    />
  );
});

export default MapCanvas;
