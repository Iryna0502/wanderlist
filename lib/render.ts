import type { Bounds, Camera, FogSpot, Place, Biome } from "./types";
import { type Viewport, worldToScreen, visibleWorldBounds } from "./camera";

/** How long the claim reveal animation runs (ms). */
export const REVEAL_MS = 1400;

/** World units — fog lock hidden when a place sits this close. */
const FOG_PLACE_GAP = 80;

const BIOME_COLOR: Record<Biome, string> = {
  water: "#4f9bb0",
  forest: "#5f8a4e",
  hills: "#b08a4a",
  peaks: "#7d6cae",
  meadow: "#d98a4a",
};

/**
 * Draw the visible region of the static map image (source rect → canvas).
 * The image is an opaque backdrop; world units == image pixels, origin centered.
 */
export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  cam: Camera,
  vp: Viewport,
  bounds: Bounds,
) {
  const halfW = bounds.w / 2;
  const halfH = bounds.h / 2;
  const vb = visibleWorldBounds(cam, vp);

  const wx0 = Math.max(-halfW, vb.minX);
  const wy0 = Math.max(-halfH, vb.minY);
  const wx1 = Math.min(halfW, vb.maxX);
  const wy1 = Math.min(halfH, vb.maxY);
  if (wx1 <= wx0 || wy1 <= wy0) return;

  const sx = wx0 + halfW;
  const sy = wy0 + halfH;
  const sw = wx1 - wx0;
  const sh = wy1 - wy0;

  const tl = worldToScreen(wx0, wy0, cam, vp);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, tl.x, tl.y, sw * cam.zoom, sh * cam.zoom);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  bm: ImageBitmap,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const ir = bm.width / bm.height;
  const dr = dw / dh;
  let sw: number, sh: number, sx: number, sy: number;
  if (ir > dr) {
    sh = bm.height;
    sw = sh * dr;
    sx = (bm.width - sw) / 2;
    sy = 0;
  } else {
    sw = bm.width;
    sh = sw / dr;
    sx = 0;
    sy = (bm.height - sh) / 2;
  }
  ctx.drawImage(bm, sx, sy, sw, sh, dx, dy, dw, dh);
}

function shadowEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  a = 0.18,
) {
  ctx.fillStyle = `rgba(60,45,25,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** The dotted trail — the path of a life, in discovery order. */
function drawTrail(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  vp: Viewport,
  places: Place[],
) {
  if (places.length < 2) return;
  const ordered = [...places].sort((a, b) => a.order - b.order);
  ctx.save();
  ctx.strokeStyle = "rgba(255,250,238,0.7)";
  ctx.lineWidth = Math.max(2, 3 * cam.zoom);
  ctx.setLineDash([1, 10]);
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(60,45,25,0.3)";
  ctx.shadowBlur = 3;
  ctx.beginPath();
  ordered.forEach((p, i) => {
    const s = worldToScreen(p.x, p.y, cam, vp);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  ctx.stroke();
  ctx.restore();
}

function biomeGlyph(
  ctx: CanvasRenderingContext2D,
  biome: Biome,
  x: number,
  y: number,
  s: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, s * 0.16);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (biome) {
    case "water":
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.7, x, y);
      ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.7, x + s, y);
      ctx.stroke();
      break;
    case "forest":
    case "hills":
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x - s * 0.72, y + s * 0.55);
      ctx.lineTo(x + s * 0.72, y + s * 0.55);
      ctx.closePath();
      ctx.fill();
      break;
    case "peaks": {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const a2 = a + Math.PI / 5;
        ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
        ctx.lineTo(x + Math.cos(a2) * s * 0.45, y + Math.sin(a2) * s * 0.45);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "meadow":
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(
          x + Math.cos(a) * s * 0.45,
          y + Math.sin(a) * s * 0.45,
          s * 0.32,
          s * 0.32,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      break;
  }
  ctx.restore();
}

function tiltFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (((h % 100) / 100) - 0.5) * 0.14;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function flame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w, y - h * 0.6, x, y - h);
  ctx.quadraticCurveTo(x + w, y - h * 0.6, x + w, y);
  ctx.quadraticCurveTo(x, y + h * 0.2, x - w, y);
  ctx.fill();
}

/** A cozy campsite: tent + flickering campfire + biome glyph hovering above. */
function drawCampsite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  biome: Biome,
  time: number,
  reduced: boolean,
  reveal: number,
) {
  const pop = easeOutBack(Math.min(1, reveal / 0.45));
  const fireOn = reveal > 0.05 ? Math.min(1, (reveal - 0.05) / 0.35) : 0;

  ctx.save();
  ctx.translate(x, y);

  shadowEllipse(ctx, 0, s * 0.55, s * 1.1, s * 0.32, 0.22);

  if (reveal > 0.5) {
    ctx.globalAlpha = Math.min(1, (reveal - 0.5) / 0.5);
    biomeGlyph(ctx, biome, 0, -s * 1.55, s * 0.34, BIOME_COLOR[biome]);
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.scale(pop, pop);

  ctx.fillStyle = "#c9743b";
  ctx.beginPath();
  ctx.moveTo(-s * 0.9, s * 0.45);
  ctx.lineTo(-s * 0.05, -s * 0.75);
  ctx.lineTo(s * 0.18, -s * 0.75);
  ctx.lineTo(s * 0.18, s * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#a85a2a";
  ctx.beginPath();
  ctx.moveTo(s * 0.18, s * 0.45);
  ctx.lineTo(s * 0.05, -s * 0.7);
  ctx.lineTo(s * 0.85, s * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#5b4a32";
  ctx.beginPath();
  ctx.moveTo(-s * 0.05, -s * 0.55);
  ctx.lineTo(-s * 0.4, s * 0.45);
  ctx.lineTo(s * 0.05, s * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#5b4a32";
  ctx.lineWidth = s * 0.08;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-s * 0.05, -s * 0.85);
  ctx.lineTo(-s * 0.05, s * 0.5);
  ctx.stroke();

  ctx.restore();

  const fx = s * 1.05;
  const fy = s * 0.35;
  ctx.strokeStyle = "#6b4a2e";
  ctx.lineWidth = Math.max(1, s * 0.12);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(fx - s * 0.35, fy);
  ctx.lineTo(fx + s * 0.35, fy - s * 0.12);
  ctx.moveTo(fx - s * 0.35, fy - s * 0.12);
  ctx.lineTo(fx + s * 0.35, fy);
  ctx.stroke();

  if (fireOn > 0) {
    const flick = reduced ? 1 : 0.85 + 0.15 * Math.sin(time * 0.02);
    const h =
      s * (0.7 + 0.18 * (reduced ? 0.5 : Math.sin(time * 0.015 + 1))) * fireOn;
    const glow = ctx.createRadialGradient(fx, fy - h * 0.3, 1, fx, fy - h * 0.3, s * 1.4);
    glow.addColorStop(0, `rgba(240,150,70,${0.45 * fireOn})`);
    glow.addColorStop(1, "rgba(240,150,70,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(fx, fy - h * 0.3, s * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e07a3c";
    flame(ctx, fx, fy, s * 0.42 * flick, h);
    ctx.fillStyle = "#f3c05a";
    flame(ctx, fx, fy, s * 0.24 * flick, h * 0.66);
  }

  ctx.restore();
}

/** Vertical lift of the polaroid above the campsite anchor (screen px). */
const CAMPSITE_LIFT = 3.75;
const CARD_LIFT_FRAC = 0.55;

/** Screen-space layout for a place marker (campsite anchor + polaroid above). */
export function placeMarkerLayout(camZoom: number) {
  const cardW = Math.max(58, Math.min(132, 92 * camZoom));
  const cardH = cardW * 0.84;
  const campS = Math.max(12, Math.min(26, 16 * camZoom));
  const polaroidOffsetY = (pop = 1) =>
    campS * CAMPSITE_LIFT + cardH * CARD_LIFT_FRAC * pop;
  return { cardW, cardH, campS, polaroidOffsetY };
}

/** A discovered place: campsite on the map + polaroid + label plaque above. */
function drawPlaceMarker(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  campS: number,
  place: Place,
  bitmap: ImageBitmap | undefined,
  reveal: number,
  active: boolean,
  time: number,
  reduced: boolean,
) {
  const pop = easeOutBack(Math.min(1, reveal / 0.8));
  const alpha = Math.min(1, reveal * 1.6);
  const cardW = w;
  const cardH = w * 0.84;
  const pad = Math.max(3, w * 0.06);
  const tilt = tiltFor(place.id);
  const centerY = sy - campS * CAMPSITE_LIFT - cardH * CARD_LIFT_FRAC * pop;

  drawCampsite(ctx, sx, sy, campS, place.biome, time, reduced, reveal);

  // Golden glow ring on the active / newest place.
  if (active) {
    const pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(time * 0.004);
    const gr = ctx.createRadialGradient(sx, centerY, w * 0.2, sx, centerY, w * 1.15 * pulse);
    gr.addColorStop(0, "rgba(108,152,65,0.55)");
    gr.addColorStop(1, "rgba(108,152,65,0)");
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(sx, centerY, w * 1.2 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  shadowEllipse(ctx, sx, centerY + cardH * 0.5, cardW * 0.42, cardH * 0.16, 0.22 * alpha);

  // The polaroid card (tilted).
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(sx, centerY);
  ctx.scale(pop, pop);
  ctx.rotate(tilt);

  ctx.save();
  ctx.shadowColor = "rgba(60,45,25,0.35)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#fbf6ec";
  roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, w * 0.08);
  ctx.fill();
  ctx.restore();

  const px = -cardW / 2 + pad;
  const py = -cardH / 2 + pad;
  const pw = cardW - pad * 2;
  const ph = cardH - pad * 2;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, w * 0.05);
  ctx.clip();
  if (bitmap) {
    drawCover(ctx, bitmap, px, py, pw, ph);
  } else {
    const g = ctx.createLinearGradient(px, py, px, py + ph);
    g.addColorStop(0, "#cdd9c0");
    g.addColorStop(1, "#a9c0a3");
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
    biomeGlyph(ctx, place.biome, 0, 0, w * 0.18, "#5b6f4e");
  }
  ctx.restore();
  ctx.restore();

  // Horizontal label plaque with a coloured biome badge.
  if (reveal > 0.45) {
    const lblAlpha = Math.min(1, (reveal - 0.45) / 0.4);
    const title = place.title.length > 22 ? place.title.slice(0, 21) + "…" : place.title;
    const fs = Math.max(9, w * 0.135);
    const ph2 = fs + 10;
    const badge = ph2 * 0.42;
    ctx.save();
    ctx.globalAlpha = alpha * lblAlpha;
    ctx.font = `600 ${fs}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
    const tw = ctx.measureText(title).width;
    const padX = ph2 * 0.42;
    const gap = ph2 * 0.3;
    const plaqueW = padX + badge * 2 + gap + tw + padX;
    const lx = sx - plaqueW / 2;
    const ly = centerY + cardH * 0.5 * pop + 6;

    ctx.shadowColor = "rgba(60,45,25,0.28)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#fbf6ec";
    roundRect(ctx, lx, ly, plaqueW, ph2, ph2 / 2);
    ctx.fill();
    ctx.shadowColor = "transparent";

    const bx = lx + padX + badge;
    const by = ly + ph2 / 2;
    ctx.fillStyle = BIOME_COLOR[place.biome];
    ctx.beginPath();
    ctx.arc(bx, by, badge, 0, Math.PI * 2);
    ctx.fill();
    biomeGlyph(ctx, place.biome, bx, by, badge * 0.55, "#ffffff");

    ctx.fillStyle = "#4a3c28";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(title, bx + badge + gap, by + 1);
    ctx.restore();
  }
}

/** An undiscovered spot: a locked "???" plaque sitting under fog. */
function drawLockedMarker(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  time: number,
  reduced: boolean,
) {
  const bob = reduced ? 0 : Math.sin(time * 0.002 + sx * 0.05) * w * 0.05;
  const y = sy + bob;
  const s = w;

  shadowEllipse(ctx, sx, sy + s * 0.55, s * 0.42, s * 0.14, 0.18);

  ctx.save();
  ctx.shadowColor = "rgba(60,45,25,0.3)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "rgba(74,60,40,0.78)";
  roundRect(ctx, sx - s / 2, y - s / 2, s, s, s * 0.22);
  ctx.fill();
  ctx.restore();

  // Lock icon.
  const lockW = s * 0.34;
  const lockH = s * 0.26;
  const lx = sx - lockW / 2;
  const ly = y - s * 0.14;
  ctx.strokeStyle = "#f3e8d2";
  ctx.fillStyle = "#f3e8d2";
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.beginPath();
  ctx.arc(sx, ly, lockW * 0.36, Math.PI, 0);
  ctx.stroke();
  roundRect(ctx, lx, ly, lockW, lockH, s * 0.04);
  ctx.fill();

  // "???"
  ctx.fillStyle = "rgba(243,232,210,0.9)";
  ctx.font = `700 ${s * 0.2}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("???", sx, y + s * 0.28);
}

function fogHiddenByPlace(fog: FogSpot, places: Place[]): boolean {
  const gap2 = FOG_PLACE_GAP * FOG_PLACE_GAP;
  for (const p of places) {
    const dx = p.x - fog.x;
    const dy = p.y - fog.y;
    if (dx * dx + dy * dy < gap2) return true;
  }
  return false;
}

export interface DynamicInput {
  cam: Camera;
  vp: Viewport;
  time: number;
  now: number;
  places: Place[];
  fog: FogSpot[];
  photos: Map<string, ImageBitmap>;
  activeId?: string;
  reduced: boolean;
}

/**
 * The cheap per-frame marker layer drawn on top of the static map image:
 * the discovery trail, polaroid place markers, and locked fog plaques.
 */
export function drawDynamic(ctx: CanvasRenderingContext2D, input: DynamicInput) {
  const { cam, vp, time, now, places, fog, photos, activeId, reduced } = input;

  drawTrail(ctx, cam, vp, places);

  const { cardW, campS } = placeMarkerLayout(cam.zoom);

  // Locked fog first (so markers overlap them).
  const lockW = Math.max(34, Math.min(70, 52 * cam.zoom));
  for (const f of fog) {
    if (fogHiddenByPlace(f, places)) continue;
    const s = worldToScreen(f.x, f.y, cam, vp);
    if (s.x < -120 || s.x > vp.width + 120 || s.y < -120 || s.y > vp.height + 120)
      continue;
    drawLockedMarker(ctx, s.x, s.y, lockW, time, reduced);
  }

  // Place markers, painter-sorted by y so lower ones overlap upper ones.
  const ordered = [...places].sort(
    (a, b) =>
      worldToScreen(a.x, a.y, cam, vp).y - worldToScreen(b.x, b.y, cam, vp).y,
  );
  for (const p of ordered) {
    const s = worldToScreen(p.x, p.y, cam, vp);
    if (s.x < -160 || s.x > vp.width + 160 || s.y < -160 || s.y > vp.height + 160)
      continue;
    const age = now - p.createdAt;
    const reveal = age >= REVEAL_MS ? 1 : Math.max(0, age / REVEAL_MS);
    drawPlaceMarker(
      ctx,
      s.x,
      s.y,
      cardW,
      campS,
      p,
      photos.get(p.id),
      reveal,
      p.id === activeId,
      time,
      reduced,
    );
  }
}
