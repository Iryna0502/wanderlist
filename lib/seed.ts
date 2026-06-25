import type { Bounds, Goal, WorldState } from "./types";
import { biomeAt } from "./biome";
import { GOAL_SPOTS, goalInBounds, spotXY } from "./goalSpots";
import { uid } from "./spawn";

/** Bump when the map art or spot layout changes — triggers a one-time relayout. */
export const MAP_LAYOUT_VERSION = 3;

/** @deprecated Use GOAL_SPOTS from ./goalSpots */
export { GOAL_SPOTS } from "./goalSpots";

/** Re-seat every goal onto the current map layout (keeps all data). */
export function relayoutWorld(world: WorldState, bounds: Bounds): WorldState {
  const goals = [...world.goals]
    .sort((a, b) => a.order - b.order)
    .map((g, i) => {
      const [fx, fy] = GOAL_SPOTS[i % GOAL_SPOTS.length];
      const { x, y } = spotXY(fx, fy, bounds);
      return { ...g, x, y, biome: biomeAt(x, y) };
    });

  return { ...world, goals, bounds };
}

/** Move any off-map goals onto predefined landmark spots. */
export function ensureGoalsOnMap(world: WorldState, bounds: Bounds): WorldState {
  let changed = false;
  const goals = world.goals.map((g, i) => {
    if (goalInBounds(g.x, g.y, bounds)) return g;
    changed = true;
    const [fx, fy] = GOAL_SPOTS[i % GOAL_SPOTS.length];
    const { x, y } = spotXY(fx, fy, bounds);
    return { ...g, x, y, biome: biomeAt(x, y) };
  });
  return changed ? { ...world, goals, bounds } : world;
}

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

/** First visit: one locked demo goal + one unlocked demo goal — no empty fog slots. */
export async function buildSeedWorld(bounds: Bounds): Promise<WorldState> {
  const unlockedPos = spotXY(GOAL_SPOTS[0][0], GOAL_SPOTS[0][1], bounds);
  const lockedPos = spotXY(GOAL_SPOTS[8][0], GOAL_SPOTS[8][1], bounds);
  const photo = await makeSeedPhoto("#6a9aa0", "#a9d0cb", "#eef3e0");
  const now = Date.now();

  const goals: Goal[] = [
    {
      id: uid(),
      x: unlockedPos.x,
      y: unlockedPos.y,
      title: "Sunset bike ride",
      text: "Golden hour on the coastal path — worth every pedal.",
      companions: "friends",
      biome: biomeAt(unlockedPos.x, unlockedPos.y),
      photo,
      status: "unlocked",
      order: 0,
      createdAt: now - 86400000,
      unlockedAt: now - 86400000,
    },
    {
      id: uid(),
      x: lockedPos.x,
      y: lockedPos.y,
      title: "навчитися серфити",
      text: "",
      companions: "alone",
      biome: biomeAt(lockedPos.x, lockedPos.y),
      photo: null,
      status: "locked",
      order: 1,
      createdAt: now,
    },
  ];

  return { goals, nextOrder: 2, bounds };
}
