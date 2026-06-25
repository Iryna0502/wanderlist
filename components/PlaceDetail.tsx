"use client";

import { useEffect, useState } from "react";
import type { Goal } from "@/lib/types";
import DeleteGoalDialog from "./DeleteGoalDialog";

const BIOME_LABEL: Record<Goal["biome"], string> = {
  water: "by the water",
  meadow: "in a meadow",
  forest: "deep in forest",
  hills: "up in the hills",
  peaks: "high on the peaks",
};

interface Props {
  goal: Goal;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function PlaceDetail({ goal, onEdit, onDelete }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setDeleteOpen(false);
  }, [goal.id]);

  useEffect(() => {
    if (!goal.photo) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(goal.photo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [goal.photo]);

  const date = new Date(goal.unlockedAt ?? goal.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleDelete = () => {
    setDeleteOpen(false);
    onDelete?.();
  };

  return (
    <div className="pb-2">
      {url ? (
        <div className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={goal.title}
            className="h-56 w-full rounded-2xl border-2 border-ink/10 object-cover"
          />
        </div>
      ) : (
        <div className="mb-4 flex h-32 w-full items-center justify-center rounded-2xl border-2 border-dashed border-ink/15 bg-parchment text-sm text-ink-faint">
          No photo for this memory
        </div>
      )}

      <div className="flex items-baseline justify-between gap-3">
        <h2 id="detail-title" className="font-hand text-3xl leading-tight text-ink">
          {goal.title}
        </h2>
        <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary-deep">
          #{goal.order + 1}
        </span>
      </div>

      <p className="mt-1 text-sm text-ink-faint">
        {date}
        {goal.location ? ` · ${goal.location}` : ` · ${BIOME_LABEL[goal.biome]}`} ·{" "}
        {goal.companions === "alone" ? "on my own" : "with friends"}
      </p>

      {goal.text && (
        <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-ink">
          {goal.text}
        </p>
      )}

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="min-h-[44px] flex-1 rounded-xl border-2 border-ink/15 bg-parchment font-semibold text-ink-soft"
        >
          Edit memory
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete experience"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-red-900/20 bg-red-50/80 text-red-900/80 active:translate-y-px"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
      </div>

      {deleteOpen && (
        <DeleteGoalDialog
          open={deleteOpen}
          title="Delete this memory?"
          description={`"${goal.title}" will be removed from the map.`}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
