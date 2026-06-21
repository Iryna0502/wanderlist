"use client";

import { useEffect, useRef, useState } from "react";
import type { Goal } from "@/lib/types";
import { useGoals } from "@/hooks/useGoals";
import MapCanvas, { type MapHandle } from "@/components/MapCanvas";
import Hud from "@/components/Hud";
import BottomSheet from "@/components/BottomSheet";
import GoalForm from "@/components/GoalForm";
import UnlockForm from "@/components/UnlockForm";
import EditGoalForm from "@/components/EditGoalForm";
import PlaceDetail from "@/components/PlaceDetail";
import Gallery from "@/components/Gallery";
import Celebration from "@/components/Celebration";

type Sheet =
  | { kind: "addGoal" }
  | { kind: "unlockGoal"; goal: Goal }
  | { kind: "detail"; goal: Goal }
  | { kind: "edit"; goal: Goal }
  | null;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export default function Page() {
  const { state, ready, addGoal, unlockGoal, updateGoal, deleteGoal, latestUnlocked } =
    useGoals();
  const reduced = usePrefersReducedMotion();
  const mapRef = useRef<MapHandle>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [celebrate, setCelebrate] = useState<Goal | null>(null);

  const recenter = () => {
    const target = latestUnlocked ?? { x: 0, y: 0 };
    mapRef.current?.flyTo(target.x, target.y, 1.1);
  };

  const handleAddGoal = (title: string) => {
    const goal = addGoal({ title });
    setSheet(null);
    if (goal) mapRef.current?.flyTo(goal.x, goal.y, 1.2);
  };

  const handleUnlock = (data: { photo: Blob; text: string }) => {
    if (sheet?.kind !== "unlockGoal") return;
    const goal = unlockGoal(sheet.goal.id, {
      photo: data.photo,
      text: data.text,
    });
    setSheet(null);
    if (goal) {
      mapRef.current?.jumpTo(goal.x, goal.y, 1.25);
      setCelebrate(goal);
    }
  };

  const handleEdit = (data: {
    title: string;
    text: string;
    location: string;
    companions: Goal["companions"];
    photo: Blob | null;
  }) => {
    if (sheet?.kind !== "edit") return;
    const base = sheet.goal;
    updateGoal(base.id, {
      title: data.title.trim() || base.title,
      text: data.text.trim(),
      location: data.location.trim() || undefined,
      companions: data.companions,
      photo: data.photo,
    });
    setSheet({
      kind: "detail",
      goal: {
        ...base,
        title: data.title.trim() || base.title,
        text: data.text.trim(),
        location: data.location.trim() || undefined,
        companions: data.companions,
        photo: data.photo,
      },
    });
  };

  const unlockedGoals = state.goals.filter((g) => g.status === "unlocked");

  return (
    <main className="map-frame relative h-full w-full overflow-hidden">
      {ready && (
        <MapCanvas
          ref={mapRef}
          goals={state.goals}
          bounds={state.bounds}
          activeId={latestUnlocked?.id}
          reduced={reduced}
          onTapLocked={(goal) => setSheet({ kind: "unlockGoal", goal })}
          onTapUnlocked={(goal) => setSheet({ kind: "detail", goal })}
        />
      )}

      {!ready && (
        <div className="flex h-full w-full items-center justify-center">
          <p className="animate-pulse font-display text-2xl text-ink">
            Unfurling the map…
          </p>
        </div>
      )}

      {ready && (
        <Hud
          onAddExperience={() => setSheet({ kind: "addGoal" })}
          onRecenter={recenter}
          onZoomIn={() => mapRef.current?.zoomBy(1.25)}
          onZoomOut={() => mapRef.current?.zoomBy(0.8)}
        />
      )}

      <Gallery
        open={galleryOpen}
        goals={unlockedGoals}
        onClose={() => setGalleryOpen(false)}
        onSelect={(goal) => {
          setGalleryOpen(false);
          setSheet({ kind: "detail", goal });
        }}
      />

      <Celebration
        goal={celebrate}
        reduced={reduced}
        onView={() => {
          if (celebrate) mapRef.current?.flyTo(celebrate.x, celebrate.y, 1.25);
          setCelebrate(null);
        }}
        onClose={() => setCelebrate(null)}
      />

      <BottomSheet
        open={sheet?.kind === "addGoal"}
        onClose={() => setSheet(null)}
        labelledBy="add-goal-title"
      >
        {sheet?.kind === "addGoal" && (
          <GoalForm
            onSubmit={handleAddGoal}
            onCancel={() => setSheet(null)}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={sheet?.kind === "unlockGoal"}
        onClose={() => setSheet(null)}
        labelledBy="unlock-title"
      >
        {sheet?.kind === "unlockGoal" && (
          <UnlockForm
            key={sheet.goal.id}
            goal={state.goals.find((g) => g.id === sheet.goal.id) ?? sheet.goal}
            onSubmit={handleUnlock}
            onCancel={() => setSheet(null)}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={sheet?.kind === "edit"}
        onClose={() =>
          setSheet((s) =>
            s?.kind === "edit" ? { kind: "detail", goal: s.goal } : s,
          )
        }
        labelledBy="edit-title"
      >
        {sheet?.kind === "edit" && (
          <EditGoalForm
            key={sheet.goal.id}
            goal={
              state.goals.find((g) => g.id === sheet.goal.id) ?? sheet.goal
            }
            onSubmit={handleEdit}
            onCancel={() => setSheet({ kind: "detail", goal: sheet.goal })}
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={sheet?.kind === "detail"}
        onClose={() => setSheet(null)}
        labelledBy="detail-title"
      >
        {sheet?.kind === "detail" && (() => {
          const goal =
            state.goals.find((g) => g.id === sheet.goal.id) ?? sheet.goal;
          return (
            <PlaceDetail
              goal={goal}
              onEdit={() => setSheet({ kind: "edit", goal })}
              onDelete={() => {
                deleteGoal(goal.id);
                setSheet(null);
              }}
            />
          );
        })()}
      </BottomSheet>
    </main>
  );
}
