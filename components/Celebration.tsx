"use client";

import { useEffect, useState } from "react";
import type { Place } from "@/lib/types";

interface Props {
  place: Place | null;
  reduced: boolean;
  onView: () => void;
  onClose: () => void;
}

export default function Celebration({ place, reduced, onView, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!place?.photo) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(place.photo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [place?.photo]);

  if (!place) return null;

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-ink/80 backdrop-blur-sm">
      <button aria-label="Dismiss" onClick={onClose} className="absolute inset-0" />
      <div className="relative flex animate-fade-in flex-col items-center px-8 text-center">
        <h2 className="font-display text-3xl text-primary-light drop-shadow">
          New Territory Unlocked!
        </h2>
        <p className="mt-1 text-sm text-parchment/80">Your world just got bigger.</p>

        <div className="relative mt-8 grid place-items-center">
          <span
            className={`absolute h-44 w-44 rounded-full border-2 border-primary-light/70 ${
              reduced ? "" : "animate-ping"
            }`}
          />
          <span className="absolute h-52 w-52 rounded-full bg-primary/20 blur-2xl" />
          <span className="absolute h-40 w-40 rounded-full border border-primary-light/40" />
          <div className="relative h-32 w-32 rotate-[-4deg] overflow-hidden rounded-2xl border-4 border-parchment-light bg-parchment shadow-marker">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={place.title} className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-2xl">✦</span>
            )}
          </div>
        </div>

        <p className="mt-8 font-hand text-2xl text-parchment-light">{place.title}</p>

        <button
          onClick={onView}
          className="mt-8 rounded-full bg-primary px-8 py-3 font-semibold text-parchment-light shadow-marker active:translate-y-px"
        >
          View on map
        </button>
      </div>
    </div>
  );
}
