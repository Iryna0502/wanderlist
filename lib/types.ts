export type Biome = "water" | "meadow" | "forest" | "hills" | "peaks";

export type Companions = "alone" | "friends";

/** A discovered place — a campsite on the map of a life. */
export interface Place {
  id: string;
  /** World coordinates (not screen). The world is infinite, so these are unbounded. */
  x: number;
  y: number;
  title: string;
  text: string;
  /** Optional place name ("where was it?"). */
  location?: string;
  companions: Companions;
  biome: Biome;
  /** Compressed JPEG of the moment. Stored as a Blob in IndexedDB. */
  photo: Blob | null;
  /** Hearts on this memory. */
  likes?: number;
  liked?: boolean;
  /** Discovery order (monotonic). Drives the dotted trail + recenter target. */
  order: number;
  createdAt: number;
}

/** Hidden, undiscovered spot sitting under fog, waiting to be claimed. */
export interface FogSpot {
  id: string;
  x: number;
  y: number;
}

/** The finite extent of the map, in world units, centered on the origin. */
export interface Bounds {
  w: number;
  h: number;
}

/** Persisted snapshot of the whole world state. */
export interface WorldState {
  places: Place[];
  fog: FogSpot[];
  /** Next discovery order value. */
  nextOrder: number;
  /** Finite map size (world units). The map is not infinite — it fits a window. */
  bounds: Bounds;
  /** Bumped when marker positions are re-laid out for a new map illustration. */
  mapLayoutVersion?: number;
}

export interface Camera {
  /** World coordinate shown at the center of the viewport. */
  x: number;
  y: number;
  /** Pixels per world unit. */
  zoom: number;
}
