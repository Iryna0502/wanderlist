/**
 * Deterministic, seedable pseudo-randomness for an infinite world.
 *
 * Everything here is a pure function of integer coordinates, so the same world
 * always regenerates identically at the same place — no storage of terrain,
 * no edges, no repetition.
 */

/** A single fixed seed makes "this world" reproducible across reloads/devices. */
export const WORLD_SEED = 1337;

/** Fast integer hash → 32-bit unsigned int. */
export function hash2(x: number, y: number, seed = WORLD_SEED): number {
  let h = seed ^ Math.imul(x | 0, 0x27d4eb2f) ^ Math.imul(y | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 13), 0x297a2d39);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Hash → float in [0, 1). */
export function rand2(x: number, y: number, seed = WORLD_SEED): number {
  return hash2(x, y, seed) / 4294967296;
}

/** mulberry32 PRNG — give a place its own stable random stream. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smooth value noise in [0, 1] sampled at an arbitrary continuous point. */
export function valueNoise(x: number, y: number, seed = WORLD_SEED): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(x - x0);
  const fy = smoothstep(y - y0);

  const v00 = rand2(x0, y0, seed);
  const v10 = rand2(x0 + 1, y0, seed);
  const v01 = rand2(x0, y0 + 1, seed);
  const v11 = rand2(x0 + 1, y0 + 1, seed);

  const top = lerp(v00, v10, fx);
  const bottom = lerp(v01, v11, fx);
  return lerp(top, bottom, fy);
}

/** Fractal (layered) value noise — more natural-looking fields. */
export function fbm(
  x: number,
  y: number,
  octaves = 4,
  seed = WORLD_SEED,
): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 911);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}
