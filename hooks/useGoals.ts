"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Bounds, Companions, Goal, WorldState } from "@/lib/types";
import { biomeAt } from "@/lib/biome";
import { loadWorld, saveWorld, clearWorld } from "@/lib/storage";
import { buildSeedWorld, ensureGoalsOnMap, MAP_LAYOUT_VERSION, relayoutWorld } from "@/lib/seed";
import { pickGoalPosition, uid } from "@/lib/spawn";
import { WORLD } from "@/lib/world";

function mapBounds(): Bounds {
  return WORLD;
}

const PERSISTENCE_WARNING =
  "Changes aren't being saved — your map may not persist.";

export interface AddGoalInput {
  title: string;
}

export interface UnlockGoalInput {
  photo: Blob;
  title?: string;
  text?: string;
  location?: string;
  companions?: Companions;
}

export function useGoals() {
  const [state, setState] = useState<WorldState>({
    goals: [],
    nextOrder: 0,
    bounds: WORLD,
  });
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastSaved = useRef<WorldState | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let world: WorldState | null = null;
      try {
        world = await loadWorld();
        if (!world) {
          world = buildSeedWorld(mapBounds());
          world.mapLayoutVersion = MAP_LAYOUT_VERSION;
          await saveWorld(world);
        } else {
          const bounds = mapBounds();
          const needsRelayout =
            world.mapLayoutVersion !== MAP_LAYOUT_VERSION ||
            world.bounds.w !== bounds.w ||
            world.bounds.h !== bounds.h;
          let needsSave = false;
          if (needsRelayout) {
            world = relayoutWorld({ ...world, bounds }, bounds);
            world.mapLayoutVersion = MAP_LAYOUT_VERSION;
            needsSave = true;
          }
          const fixed = ensureGoalsOnMap({ ...world, bounds }, bounds);
          if (fixed !== world) {
            world = fixed;
            needsSave = true;
          }
          if (needsSave) await saveWorld(world);
        }
        if (!cancelled) {
          world = { ...world!, bounds: mapBounds() };
          lastSaved.current = world;
          hydrated.current = true;
          setStorageBlocked(false);
          setSaveError(null);
          setState(world);
        }
      } catch (err) {
        console.error("Failed to load world", err);
        if (!cancelled) {
          const fallback = world ?? buildSeedWorld(mapBounds());
          fallback.mapLayoutVersion = MAP_LAYOUT_VERSION;
          setState({ ...fallback, bounds: mapBounds() });
          setStorageBlocked(true);
          setSaveError(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !hydrated.current) return;
    if (lastSaved.current === state) return;

    const snapshot = state;
    let cancelled = false;
    saveWorld(snapshot)
      .then(() => {
        if (cancelled) return;
        lastSaved.current = snapshot;
        setSaveError(null);
      })
      .catch((err) => {
        console.error("Failed to save world", err);
        if (!cancelled) setSaveError(PERSISTENCE_WARNING);
      });

    return () => {
      cancelled = true;
    };
  }, [state, ready]);

  /** Create a locked goal with a title — no photo yet. */
  const addGoal = useCallback((input: AddGoalInput): Goal | null => {
    const title = input.title.trim();
    if (!title) return null;

    let created: Goal | null = null;
    setState((prev) => {
      const withoutSeed = prev.goals.filter((g) => !g.isSeed);
      const latest = withoutSeed.reduce<Goal | null>(
        (best, g) => (!best || g.order >= best.order ? g : best),
        null,
      );
      const originX = latest?.x ?? 0;
      const originY = latest?.y ?? 0;
      const { x, y } = pickGoalPosition(originX, originY, withoutSeed, prev.bounds);

      const goal: Goal = {
        id: uid(),
        x,
        y,
        title,
        text: "",
        companions: "alone",
        biome: biomeAt(x, y),
        photo: null,
        status: "locked",
        order: prev.nextOrder,
        createdAt: Date.now(),
      };
      created = goal;
      return {
        ...prev,
        goals: [...withoutSeed, goal],
        nextOrder: prev.nextOrder + 1,
      };
    });
    return created;
  }, []);

  /** Complete a locked goal — photo required, unlocks the marker. */
  const unlockGoal = useCallback((id: string, input: UnlockGoalInput): Goal | null => {
    let updated: Goal | null = null;
    setState((prev) => {
      const goal = prev.goals.find((g) => g.id === id);
      if (!goal || goal.status !== "locked") return prev;

      const next: Goal = {
        ...goal,
        status: "unlocked",
        title: input.title?.trim() || goal.title,
        photo: input.photo,
        text: input.text?.trim() ?? goal.text,
        location: input.location?.trim() || undefined,
        companions: input.companions ?? goal.companions,
        unlockedAt: Date.now(),
      };
      updated = next;
      return {
        ...prev,
        goals: prev.goals.map((g) => (g.id === id ? next : g)),
      };
    });
    return updated;
  }, []);

  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }));
  }, []);

  const reset = useCallback(async () => {
    try {
      await clearWorld();
      const world = buildSeedWorld(mapBounds());
      world.mapLayoutVersion = MAP_LAYOUT_VERSION;
      await saveWorld(world);
      lastSaved.current = world;
      hydrated.current = true;
      setStorageBlocked(false);
      setSaveError(null);
      setState(world);
    } catch (err) {
      console.error("Failed to reset world", err);
      setStorageBlocked(true);
      setSaveError(PERSISTENCE_WARNING);
    }
  }, []);

  const latestUnlocked =
    state.goals.filter((g) => g.status === "unlocked").sort((a, b) => b.order - a.order)[0] ??
    null;

  return {
    state,
    ready,
    storageBlocked,
    saveError,
    addGoal,
    unlockGoal,
    updateGoal,
    deleteGoal,
    reset,
    latestUnlocked,
  };
}
