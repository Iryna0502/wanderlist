import type { Bounds, Place, FogSpot, WorldState } from "./types";
import { biomeAt } from "./biome";
import { uid } from "./spawn";

/** Bump when the map art or spot layout changes — triggers a one-time relayout. */
export const MAP_LAYOUT_VERSION = 3;

/**
 * Landmark positions on the 1024×1024 map (fractions of half-extent, −1…1).
 * Tuned to paths and features on the current illustration.
 */
export const PLACE_SPOTS: Array<[number, number]> = [
  [0, 0.02], // center — stone circle / path junction
  [0.04, -0.44], // top — bell on the hill
  [-0.5, 0.44], // bottom-left — coastal village
  [0.36, -0.38], // top-right — big mountain
  [-0.42, -0.12], // mid-left — forest
  [0.38, 0.08], // mid-right — cave mountain
  [0.28, 0.4], // bottom-right — river village
  [0.12, -0.58], // upper path
];

export const FOG_SPOTS: Array<[number, number]> = [
  [0.22, 0.32], // lower path fork
  [-0.28, 0.18], // left woodland
  [0.48, 0.22], // east trail
  [-0.12, -0.38], // north-west slope
  [0.08, 0.52], // south meadow
  [-0.55, -0.35], // far north-west
];

/** World xy from fractional map coordinates, clamped inside the image. */
export function spotXY(fx: number, fy: number, bounds: Bounds): { x: number; y: number } {
  const pad = 48;
  const hx = bounds.w / 2 - pad;
  const hy = bounds.h / 2 - pad;
  return {
    x: Math.max(-hx, Math.min(hx, fx * hx)),
    y: Math.max(-hy, Math.min(hy, fy * hy)),
  };
}

/** Re-seat every place and fog spot onto the current map layout (keeps all data). */
export function relayoutWorld(world: WorldState, bounds: Bounds): WorldState {
  const places = [...world.places]
    .sort((a, b) => a.order - b.order)
    .map((p, i) => {
      const [fx, fy] = PLACE_SPOTS[i % PLACE_SPOTS.length];
      const { x, y } = spotXY(fx, fy, bounds);
      return { ...p, x, y, biome: biomeAt(x, y) };
    });

  const fog = world.fog.map((f, i) => {
    const [fx, fy] = FOG_SPOTS[i % FOG_SPOTS.length];
    const { x, y } = spotXY(fx, fy, bounds);
    return { ...f, x, y };
  });

  return { ...world, places, fog, bounds };
}

/** Make a small, warm gradient "photo" so seed memories aren't empty. */
function makeSeedPhoto(a: string, b: string, c: string): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  const g = ctx.createLinearGradient(0, 0, 0, 360);
  g.addColorStop(0, a);
  g.addColorStop(0.55, b);
  g.addColorStop(1, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 480, 360);

  const sun = ctx.createRadialGradient(370, 90, 6, 370, 90, 90);
  sun.addColorStop(0, "rgba(255,247,224,0.95)");
  sun.addColorStop(1, "rgba(255,247,224,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 480, 360);

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.moveTo(0, 250);
  for (let x = 0; x <= 480; x += 40) {
    ctx.quadraticCurveTo(x + 20, 235 + ((x / 40) % 2) * 22, x + 40, 250);
  }
  ctx.lineTo(480, 360);
  ctx.lineTo(0, 360);
  ctx.closePath();
  ctx.fill();

  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.8),
  );
}

interface Sketch {
  spot: [number, number];
  title: string;
  text: string;
  companions: Place["companions"];
  colors: [string, string, string];
}

const SEEDS: Sketch[] = [
  {
    spot: PLACE_SPOTS[0],
    title: "Where it began",
    text: "First night under the open sky. Couldn't sleep for the stars.",
    companions: "alone",
    colors: ["#3a4a6b", "#c98a5a", "#f0c98a"],
  },
  {
    spot: PLACE_SPOTS[1],
    title: "The long hike",
    text: "Six hours up, worth every step for the view from the ridge.",
    companions: "friends",
    colors: ["#5a7a8c", "#8ab0a0", "#dfe6c0"],
  },
  {
    spot: PLACE_SPOTS[2],
    title: "Lake morning",
    text: "Coffee by still water. The kind of quiet you remember.",
    companions: "friends",
    colors: ["#6a9aa0", "#a9d0cb", "#eef3e0"],
  },
];

/** Build the first-visit world: a few discovered places + nearby fog to claim. */
export async function buildSeedWorld(bounds: Bounds): Promise<WorldState> {
  const places: Place[] = [];
  let order = 0;

  for (const s of SEEDS) {
    const pos = spotXY(s.spot[0], s.spot[1], bounds);
    const photo = await makeSeedPhoto(...s.colors);
    places.push({
      id: uid(),
      x: pos.x,
      y: pos.y,
      title: s.title,
      text: s.text,
      companions: s.companions,
      biome: biomeAt(pos.x, pos.y),
      photo,
      order: order++,
      createdAt: Date.now() - (SEEDS.length - order) * 86400000,
    });
  }

  const fog: FogSpot[] = FOG_SPOTS.slice(0, 4).map(([fx, fy]) => {
    const pos = spotXY(fx, fy, bounds);
    return { id: uid(), x: pos.x, y: pos.y };
  });

  return { places, fog, nextOrder: order, bounds };
}
