import type { Bounds, Goal, WorldState } from "./types";
import { WORLD } from "./world";

export const SCHEMA_VERSION = 3;

/**
 * Persistence — IndexedDB, on-device only.
 * Store "places" holds Goal records (name kept for upgrade compatibility).
 */
const DB_NAME = "wanderlist";
const DB_VERSION = 2;
const GOALS = "places";
const META = "meta";
const META_KEY = "world";

interface StoredMeta {
  nextOrder: number;
  bounds?: Bounds;
  mapLayoutVersion?: number;
  schemaVersion?: number;
  /** @deprecated v1 — discarded on migration */
  fog?: unknown[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(GOALS)) {
        db.createObjectStore(GOALS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  run: (t: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result: T;
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
    Promise.resolve(run(t)).then((r) => {
      result = r;
    }, reject);
  });
}

function reqDone<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** v1 row shape — migrated to unlocked goals on load. */
interface LegacyPlace {
  id: string;
  x: number;
  y: number;
  title: string;
  text: string;
  location?: string;
  companions: Goal["companions"];
  biome: Goal["biome"];
  photo: Blob | null;
  likes?: number;
  liked?: boolean;
  order: number;
  createdAt: number;
}

/**
 * Fog-era corrupt row — title was built as `undefined` + "Ride a hot air balloon".
 * Match title alone would delete real user goals with the same name.
 */
function isLegacyBalloonGoal(goal: Pick<Goal, "title" | "isSeed">): boolean {
  if (/^undefined.*hot air balloon/i.test(goal.title)) return true;
  if (goal.isSeed === true && /hot air balloon/i.test(goal.title)) return true;
  return false;
}

/** v1 Place rows → unlocked goals; empty fog meta is dropped. */
function migrateRecords(
  records: unknown[],
  meta: StoredMeta | undefined,
): { state: WorldState; strippedLegacyBalloon: boolean } {
  const goals: Goal[] = [];

  for (const raw of records) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;

    if (row.status === "locked" || row.status === "unlocked") {
      goals.push(raw as Goal);
      continue;
    }

    const place = raw as LegacyPlace;
    if (!place.id || !place.title) continue;
    goals.push({
      ...place,
      status: "unlocked",
      unlockedAt: place.createdAt,
    });
  }

  goals.sort((a, b) => a.order - b.order);

  const kept = goals.filter((g) => !isLegacyBalloonGoal(g));

  return {
    state: {
      goals: kept,
      nextOrder: meta?.nextOrder ?? kept.length,
      bounds: WORLD,
      mapLayoutVersion: meta?.mapLayoutVersion,
    },
    strippedLegacyBalloon: kept.length < goals.length,
  };
}

export async function loadWorld(): Promise<WorldState | null> {
  const db = await openDB();
  try {
    const world = await tx(db, [GOALS, META], "readonly", async (t) => {
      const records = (await reqDone(t.objectStore(GOALS).getAll())) as unknown[];
      const meta = (await reqDone(
        t.objectStore(META).get(META_KEY),
      )) as StoredMeta | undefined;
      if (!meta && records.length === 0) return null;
      return migrateRecords(records, meta);
    });

    if (
      world &&
      (world.strippedLegacyBalloon || (await needsPersistedMigration(db, world.state)))
    ) {
      await saveWorld(world.state);
    }

    return world?.state ?? null;
  } finally {
    db.close();
  }
}

/** Re-save once after v1→v2 migration so fog is gone from meta. */
async function needsPersistedMigration(
  db: IDBDatabase,
  _world: WorldState,
): Promise<boolean> {
  return tx(db, [META], "readonly", async (t) => {
    const meta = (await reqDone(
      t.objectStore(META).get(META_KEY),
    )) as StoredMeta | undefined;
    return (meta?.schemaVersion ?? 1) < SCHEMA_VERSION || Array.isArray(meta?.fog);
  });
}

export async function saveWorld(state: WorldState): Promise<void> {
  const db = await openDB();
  try {
    await tx(db, [GOALS, META], "readwrite", async (t) => {
      const store = t.objectStore(GOALS);
      await reqDone(store.clear());
      for (const g of state.goals) store.put(g);
      t.objectStore(META).put(
        {
          nextOrder: state.nextOrder,
          bounds: state.bounds,
          mapLayoutVersion: state.mapLayoutVersion,
          schemaVersion: SCHEMA_VERSION,
        },
        META_KEY,
      );
    });
  } finally {
    db.close();
  }
}

export async function clearWorld(): Promise<void> {
  const db = await openDB();
  try {
    await tx(db, [GOALS, META], "readwrite", (t) => {
      t.objectStore(GOALS).clear();
      t.objectStore(META).clear();
    });
  } finally {
    db.close();
  }
}
