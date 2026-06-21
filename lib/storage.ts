import type { Bounds, Place, FogSpot, WorldState } from "./types";

const DEFAULT_BOUNDS: Bounds = { w: 1200, h: 1600 };

/**
 * Persistence layer — IndexedDB, ZERO backend.
 *
 * Why IndexedDB over localStorage: localStorage is capped near ~5MB and only
 * stores strings, so photos must be base64 (≈ +33% size) — a few snapshots and
 * you're full. IndexedDB stores photo Blobs natively with far larger quota, so
 * the map of a life can keep growing. Tradeoff: the API is async, wrapped below.
 *
 * Layout: one "places" store (photo Blob lives on each record) + one "meta"
 * store holding fog spots and the order counter.
 */
const DB_NAME = "wanderlist";
const DB_VERSION = 1;
const PLACES = "places";
const META = "meta";
const META_KEY = "world";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PLACES)) {
        db.createObjectStore(PLACES, { keyPath: "id" });
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

export async function loadWorld(): Promise<WorldState | null> {
  const db = await openDB();
  try {
    return await tx(db, [PLACES, META], "readonly", async (t) => {
      const places = (await reqDone(
        t.objectStore(PLACES).getAll(),
      )) as Place[];
      const meta = (await reqDone(
        t.objectStore(META).get(META_KEY),
      )) as
        | {
            fog: FogSpot[];
            nextOrder: number;
            bounds?: Bounds;
            mapLayoutVersion?: number;
          }
        | undefined;
      if (!meta && places.length === 0) return null;
      places.sort((a, b) => a.order - b.order);
      return {
        places,
        fog: meta?.fog ?? [],
        nextOrder: meta?.nextOrder ?? places.length,
        bounds: meta?.bounds ?? DEFAULT_BOUNDS,
        mapLayoutVersion: meta?.mapLayoutVersion,
      };
    });
  } finally {
    db.close();
  }
}

export async function saveWorld(state: WorldState): Promise<void> {
  const db = await openDB();
  try {
    await tx(db, [PLACES, META], "readwrite", async (t) => {
      const placeStore = t.objectStore(PLACES);
      await reqDone(placeStore.clear());
      for (const p of state.places) placeStore.put(p);
      t.objectStore(META).put(
        {
          fog: state.fog,
          nextOrder: state.nextOrder,
          bounds: state.bounds,
          mapLayoutVersion: state.mapLayoutVersion,
        },
        META_KEY,
      );
    });
  } finally {
    db.close();
  }
}

/** Wipe everything (used by the "start over" affordance). */
export async function clearWorld(): Promise<void> {
  const db = await openDB();
  try {
    await tx(db, [PLACES, META], "readwrite", (t) => {
      t.objectStore(PLACES).clear();
      t.objectStore(META).clear();
    });
  } finally {
    db.close();
  }
}
