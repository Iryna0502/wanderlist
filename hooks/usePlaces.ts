"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Bounds, Companions, FogSpot, Place, WorldState } from "@/lib/types";
import { biomeAt } from "@/lib/biome";
import { loadWorld, saveWorld, clearWorld } from "@/lib/storage";
import { buildSeedWorld, MAP_LAYOUT_VERSION, relayoutWorld } from "@/lib/seed";
import { spawnNearbyFog, uid } from "@/lib/spawn";
import { WORLD } from "@/lib/world";

/** Bounds are fixed to the static map image's natural pixel dimensions. */
function mapBounds(): Bounds {
  return WORLD;
}

export interface ClaimInput {
  fogId: string;
  title: string;
  text: string;
  location: string;
  companions: Companions;
  photo: Blob | null;
}

export function usePlaces() {
  const [state, setState] = useState<WorldState>({
    places: [],
    fog: [],
    nextOrder: 0,
    bounds: WORLD,
  });
  const [ready, setReady] = useState(false);
  const lastSaved = useRef<WorldState | null>(null);

  // Load existing world or seed a fresh one on first visit.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let world = await loadWorld();
        if (!world) {
          world = await buildSeedWorld(mapBounds());
          world.mapLayoutVersion = MAP_LAYOUT_VERSION;
          await saveWorld(world);
        } else {
          const bounds = mapBounds();
          const needsRelayout =
            world.mapLayoutVersion !== MAP_LAYOUT_VERSION ||
            world.bounds.w !== bounds.w ||
            world.bounds.h !== bounds.h;
          if (needsRelayout) {
            world = relayoutWorld({ ...world, bounds }, bounds);
            world.mapLayoutVersion = MAP_LAYOUT_VERSION;
            await saveWorld(world);
          }
        }
        if (!cancelled) {
          lastSaved.current = world;
          setState(world);
        }
      } catch (err) {
        console.error("Failed to load world", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist whenever state changes (after initial load).
  useEffect(() => {
    if (!ready) return;
    if (lastSaved.current === state) return;
    lastSaved.current = state;
    saveWorld(state).catch((err) => console.error("Failed to save world", err));
  }, [state, ready]);

  /** Claim a fog spot → it becomes a campsite, and new fog rises nearby. */
  const claim = useCallback((input: ClaimInput): Place | null => {
    let created: Place | null = null;
    setState((prev) => {
      const spot = prev.fog.find((f) => f.id === input.fogId);
      if (!spot) return prev;
      const place: Place = {
        id: uid(),
        x: spot.x,
        y: spot.y,
        title: input.title.trim() || "A place I found",
        text: input.text.trim(),
        location: input.location.trim() || undefined,
        companions: input.companions,
        biome: biomeAt(spot.x, spot.y),
        photo: input.photo,
        likes: 0,
        liked: false,
        order: prev.nextOrder,
        createdAt: Date.now(),
      };
      created = place;
      const remainingFog = prev.fog.filter(
        (f) =>
          f.id !== input.fogId &&
          (f.x - spot.x) ** 2 + (f.y - spot.y) ** 2 > 80 ** 2,
      );
      const places = [...prev.places, place];
      // THE RULE: a new fog spot rises somewhere nearby (within the finite map).
      const newFog: FogSpot = spawnNearbyFog(
        spot.x,
        spot.y,
        places,
        remainingFog,
        prev.bounds,
      );
      return {
        places,
        fog: [...remainingFog, newFog],
        nextOrder: prev.nextOrder + 1,
        bounds: prev.bounds,
      };
    });
    return created;
  }, []);

  const updatePlace = useCallback((id: string, patch: Partial<Place>) => {
    setState((prev) => ({
      ...prev,
      places: prev.places.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const removePhoto = useCallback((id: string) => {
    updatePlace(id, { photo: null });
  }, [updatePlace]);

  /** Remove a place and return fog to that spot so it can be reclaimed. */
  const deletePlace = useCallback((id: string) => {
    setState((prev) => {
      const place = prev.places.find((p) => p.id === id);
      if (!place) return prev;
      return {
        ...prev,
        places: prev.places.filter((p) => p.id !== id),
        fog: [...prev.fog, { id: uid(), x: place.x, y: place.y }],
      };
    });
  }, []);

  const reset = useCallback(async () => {
    await clearWorld();
    const world = await buildSeedWorld(mapBounds());
    world.mapLayoutVersion = MAP_LAYOUT_VERSION;
    await saveWorld(world);
    lastSaved.current = world;
    setState(world);
  }, []);

  const latestPlace = state.places.length
    ? state.places.reduce((a, b) => (a.order >= b.order ? a : b))
    : null;

  return { state, ready, claim, updatePlace, removePhoto, deletePlace, reset, latestPlace };
}
