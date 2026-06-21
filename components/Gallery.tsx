"use client";

import { useEffect, useState } from "react";
import type { Place } from "@/lib/types";

function Thumb({ place, onClick }: { place: Place; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!place.photo) return;
    const u = URL.createObjectURL(place.photo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [place.photo]);

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square overflow-hidden rounded-xl border border-ink/10 bg-parchment shadow-marker"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={place.title}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      ) : (
        <span className="grid h-full w-full place-items-center text-xs text-ink-faint">
          no photo
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink/80 to-transparent px-2 pb-1.5 pt-6 text-left text-xs font-semibold text-parchment-light">
        {place.title}
      </span>
    </button>
  );
}

interface Props {
  open: boolean;
  places: Place[];
  onClose: () => void;
  onSelect: (place: Place) => void;
}

export default function Gallery({ open, places, onClose, onSelect }: Props) {
  if (!open) return null;
  const ordered = [...places].sort((a, b) => b.order - a.order);

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
            No memories yet. Tap a locked spot on the map to add one.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {ordered.map((p) => (
              <Thumb key={p.id} place={p} onClick={() => onSelect(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
