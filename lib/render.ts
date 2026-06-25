import type { Bounds, Camera, Goal, Biome } from "./types";
import { type Viewport, worldToScreen, visibleWorldBounds } from "./camera";

/** How long the unlock reveal animation runs (ms). */
export const REVEAL_MS = 1400;

const MARKER_FONT =
  '600 %fpx ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

/** Experience title on locked/unlocked map markers (screen px). */
const MARKER_TITLE_FS = 15;
const MARKER_TITLE_MIN_CHARS = 20;
/** Semibold sans average glyph width for mixed Latin/Cyrillic. */
const MARKER_TITLE_CHAR_EM = 0.66;

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

/** Fit text to a max pixel width — works for Cyrillic/Latin mixed strings. */
function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  minChars = 0,
): string {
  const trimmed = text.trim();
  if (!trimmed || maxWidth <= 0) return "";
  if (ctx.measureText(trimmed).width <= maxWidth) return trimmed;

  const ell = "…";
  if (ctx.measureText(ell).width > maxWidth) return "";

  let lo = 0;
  let hi = trimmed.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = trimmed.slice(0, mid) + ell;
    if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }

  let count = lo;
  if (minChars > 0 && trimmed.length > minChars && count < minChars) {
    const forced = trimmed.slice(0, minChars) + ell;
    if (ctx.measureText(forced).width <= maxWidth) count = minChars;
  }

  return count > 0 ? trimmed.slice(0, count) + ell : ell;
}

/** The dotted trail — unlocked goals in discovery order. */
function drawTrail(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  vp: Viewport,
  goals: Goal[],
) {
  const unlocked = goals
    .filter((g) => g.status === "unlocked")
    .sort((a, b) => a.order - b.order);
  if (unlocked.length < 2) return;

  ctx.save();
  ctx.strokeStyle = "rgba(255,250,238,0.7)";
  ctx.lineWidth = Math.max(2, 3 * cam.zoom);
  ctx.setLineDash([1, 10]);
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(60,45,25,0.3)";
  ctx.shadowBlur = 3;
  ctx.beginPath();
  unlocked.forEach((g, i) => {
    const s = worldToScreen(g.x, g.y, cam, vp);
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

/** A cozy campsite: tent + flickering campfire. */
function drawCampsite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  time: number,
  reduced: boolean,
  reveal: number,
) {
  const pop = easeOutBack(Math.min(1, reveal / 0.45));
  const fireOn = reveal > 0.05 ? Math.min(1, (reveal - 0.05) / 0.35) : 0;

  ctx.save();
  ctx.translate(x, y);

  shadowEllipse(ctx, 0, s * 0.55, s * 1.1, s * 0.32, 0.22);

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

/** Tent peak/top offset from anchor (matches drawCampsite geometry). */
const TENT_TOP_FRAC = 0.85;
/** Screen px gap between tent top, title plaque, and polaroid (bottom → top stack). */
const MARKER_GAP = 8;

/** Screen-space layout for an unlocked goal marker (polaroid + title above tent). */
export function placeMarkerLayout(camZoom: number) {
  const cardW = Math.max(58, Math.min(132, 92 * camZoom));
  const cardH = cardW * 0.84;
  const campS = Math.max(12, Math.min(26, 16 * camZoom));
  const labelH = lockedMarkerLayout(camZoom).labelH;
  /** Distance from tent anchor (sy) up to polaroid center. */
  const polaroidOffsetY = (pop = 1) =>
    campS * TENT_TOP_FRAC +
    MARKER_GAP +
    labelH +
    MARKER_GAP +
    cardH * 0.5 * pop;
  /** Title plaque top (screen y) given tent anchor sy. */
  const titlePlaqueY = (sy: number) =>
    sy - campS * TENT_TOP_FRAC - MARKER_GAP - labelH;
  return { cardW, cardH, campS, labelH, polaroidOffsetY, titlePlaqueY };
}

/** Screen-space layout for a locked goal marker (lock + title plaque). */
export function lockedMarkerLayout(camZoom: number) {
  const lockW = Math.max(34, Math.min(70, 52 * camZoom));
  const fs = MARKER_TITLE_FS;
  const labelH = fs + 8;
  const minTextW = Math.ceil(fs * MARKER_TITLE_CHAR_EM * MARKER_TITLE_MIN_CHARS);
  const labelMaxW = Math.max(lockW * 2.5, minTextW);
  const fogR = lockW * 1.55;
  return { lockW, fs, labelH, labelMaxW, fogR };
}

/** Drifting mist behind locked goals — fades out when the goal unlocks. */
function drawGoalFog(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  radius: number,
  time: number,
  reduced: boolean,
  alpha = 1,
) {
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  const t = reduced ? 0 : time * 0.0006;
  const puffs = 6;
  for (let i = 0; i < puffs; i++) {
    const a = (i / puffs) * Math.PI * 2;
    const dx = Math.cos(a + t) * radius * 0.5;
    const dy = Math.sin(a * 1.3 + t) * radius * 0.32;
    const r = radius * (0.6 + 0.18 * Math.sin(t * 2 + i));
    const g = ctx.createRadialGradient(sx + dx, sy + dy, 1, sx + dx, sy + dy, r);
    g.addColorStop(0, "rgba(241,237,228,0.95)");
    g.addColorStop(0.55, "rgba(241,237,228,0.55)");
    g.addColorStop(1, "rgba(226,214,190,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx + dx, sy + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Unlocked goal: campsite + polaroid + title plaque. */
function drawUnlockedMarker(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  campS: number,
  goal: Goal,
  bitmap: ImageBitmap | undefined,
  reveal: number,
  active: boolean,
  time: number,
  reduced: boolean,
  titleFs: number,
  titleLabelH: number,
  titleMaxW: number,
) {
  const pop = easeOutBack(Math.min(1, reveal / 0.8));
  const alpha = Math.min(1, reveal * 1.6);
  const cardW = w;
  const cardH = w * 0.84;
  const pad = Math.max(3, w * 0.06);
  const tilt = tiltFor(goal.id);
  const titleBottom = sy - campS * TENT_TOP_FRAC - MARKER_GAP;
  const titleY = titleBottom - titleLabelH;
  const centerY =
    reveal > 0.45
      ? titleY - MARKER_GAP - cardH * 0.5 * pop
      : titleBottom - cardH * 0.5 * pop;

  drawCampsite(ctx, sx, sy, campS, time, reduced, reveal);

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
    biomeGlyph(ctx, goal.biome, 0, 0, w * 0.18, "#5b6f4e");
  }
  ctx.restore();
  ctx.restore();

  if (reveal > 0.45) {
    const lblAlpha = Math.min(1, (reveal - 0.45) / 0.4);
    const padX = titleFs * 0.45;

    ctx.save();
    ctx.globalAlpha = alpha * lblAlpha;
    ctx.font = MARKER_FONT.replace("%f", String(titleFs));
    const title = truncateToWidth(ctx, goal.title, titleMaxW, MARKER_TITLE_MIN_CHARS);
    const tw = ctx.measureText(title).width;
    const plaqueW = padX + tw + padX;
    const lx = sx - plaqueW / 2;
    const ly = titleY;

    ctx.shadowColor = "rgba(60,45,25,0.28)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#fbf6ec";
    roundRect(ctx, lx, ly, plaqueW, titleLabelH, titleLabelH / 2);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.fillStyle = "#4a3c28";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, sx, ly + titleLabelH / 2 + 1);
    ctx.restore();
  }
}

/** Locked goal: lock plaque + title label (pixel-truncated). */
function drawLockedMarker(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  fs: number,
  labelH: number,
  labelMaxW: number,
  time: number,
  reduced: boolean,
  title: string,
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

  ctx.font = MARKER_FONT.replace("%f", String(fs));
  const label = truncateToWidth(ctx, title, labelMaxW, MARKER_TITLE_MIN_CHARS);
  if (!label) return;

  const tw = ctx.measureText(label).width;
  const padX = fs * 0.45;
  const plaqueW = padX + tw + padX;
  const plaqueX = sx - plaqueW / 2;
  const plaqueY = y + s * 0.52 + 4;

  ctx.save();
  ctx.shadowColor = "rgba(60,45,25,0.28)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "rgba(251,246,236,0.95)";
  roundRect(ctx, plaqueX, plaqueY, plaqueW, labelH, labelH / 2);
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.fillStyle = "#4a3c28";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, sx, plaqueY + labelH / 2 + 1);
  ctx.restore();
}

export interface DynamicInput {
  cam: Camera;
  vp: Viewport;
  time: number;
  now: number;
  goals: Goal[];
  photos: Map<string, ImageBitmap>;
  activeId?: string;
  reduced: boolean;
}

/**
 * Marker layer on top of the static map: trail + locked/unlocked goal markers.
 */
export function drawDynamic(ctx: CanvasRenderingContext2D, input: DynamicInput) {
  const { cam, vp, time, now, goals, photos, activeId, reduced } = input;

  drawTrail(ctx, cam, vp, goals);

  const { cardW, campS } = placeMarkerLayout(cam.zoom);
  const { lockW, fs, labelH, labelMaxW, fogR } = lockedMarkerLayout(cam.zoom);
  const margin = Math.max(160, fogR * 2.4);

  const ordered = [...goals].sort(
    (a, b) =>
      worldToScreen(a.x, a.y, cam, vp).y - worldToScreen(b.x, b.y, cam, vp).y,
  );

  for (const g of ordered) {
    const s = worldToScreen(g.x, g.y, cam, vp);
    if (s.x < -margin || s.x > vp.width + margin || s.y < -margin || s.y > vp.height + margin)
      continue;

    if (g.status === "locked") {
      drawGoalFog(ctx, s.x, s.y, fogR, time, reduced);
      drawLockedMarker(
        ctx,
        s.x,
        s.y,
        lockW,
        fs,
        labelH,
        labelMaxW,
        time,
        reduced,
        g.title,
      );
      continue;
    }

    const unlockTime = g.unlockedAt ?? g.createdAt;
    const age = now - unlockTime;
    const reveal = age >= REVEAL_MS ? 1 : Math.max(0, age / REVEAL_MS);
    if (reveal < 1) {
      const fogAlpha = 1 - Math.min(1, reveal / 0.65);
      drawGoalFog(ctx, s.x, s.y, fogR, time, reduced, fogAlpha);
    }
    drawUnlockedMarker(
      ctx,
      s.x,
      s.y,
      cardW,
      campS,
      g,
      photos.get(g.id),
      reveal,
      g.id === activeId,
      time,
      reduced,
      fs,
      labelH,
      labelMaxW,
    );
  }
}
