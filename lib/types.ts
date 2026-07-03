export type Biome = "water" | "meadow" | "forest" | "hills" | "peaks";

export type Companions = "alone" | "friends";

export type GoalStatus = "locked" | "unlocked";

/** A goal on the map — locked until the user completes it with a photo. */
export interface Goal {
  id: string;
  /** World coordinates on the static map. */
  x: number;
  y: number;
  title: string;
  status: GoalStatus;
  text: string;
  location?: string;
  companions: Companions;
  biome: Biome;
  /** Proof photo — required to unlock; null while locked. */
  photo: Blob | null;
  likes?: number;
  liked?: boolean;
  /** Monotonic order — drives the dotted trail. */
  order: number;
  createdAt: number;
  unlockedAt?: number;
  /** Demo marker shown on first visit — removed when the user adds a real goal. */
  isSeed?: boolean;
}

/** The finite extent of the map, in world units, centered on the origin. */
export interface Bounds {
  w: number;
  h: number;
}

/** Persisted snapshot of the whole world state. */
export interface WorldState {
  goals: Goal[];
  nextOrder: number;
  bounds: Bounds;
  mapLayoutVersion?: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}
