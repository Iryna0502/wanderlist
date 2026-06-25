"use client";

import { useEffect, useState } from "react";
import type { Goal } from "@/lib/types";

function Thumb({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!goal.photo) return;
    const u = URL.createObjectURL(goal.photo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [goal.photo]);

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-xl border border-ink/10 bg-parchment shadow-marker"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={goal.title}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      ) : (
        <span className="grid h-full w-full place-items-center text-xs text-ink-faint">
          no photo
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink/80 to-transparent px-2 pb-1.5 pt-6 text-left text-xs font-semibold text-parchment-light">
        {goal.title}
      </span>
    </button>
  );
}

interface Props {
  open: boolean;
  goals: Goal[];
  onClose: () => void;
  onSelect: (goal: Goal) => void;
}

export default function Gallery({ open, goals, onClose, onSelect }: Props) {
  if (!open) return null;
  const ordered = [...goals].sort((a, b) => b.order - a.order);

  return (
    <div className="absolute inset-0 z-40">
      <button
        aria-label="Close gallery"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-ink/50 backdrop-blur-[2px]"
      />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[82%] animate-sheet-up overflow-y-auto rounded-t-3xl border-t border-ink/10 bg-parchment-light p-5 shadow-sheet"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/15" />
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-ink">Gallery</h2>
          <span className="text-sm text-ink-faint">{ordered.length} memories</span>
        </div>
        {ordered.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-faint">
            No memories yet. Complete a locked experience with a photo to unlock it.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {ordered.map((g) => (
              <Thumb key={g.id} goal={g} onClick={() => onSelect(g)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
