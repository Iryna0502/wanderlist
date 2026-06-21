"use client";

import { useEffect, useRef, useState } from "react";
import type { Place } from "@/lib/types";
import { compressImage } from "@/lib/image";

const BIOME_LABEL: Record<Place["biome"], string> = {
  water: "by the water",
  meadow: "in a meadow",
  forest: "deep in forest",
  hills: "up in the hills",
  peaks: "high on the peaks",
};

interface Props {
  place: Place;
  onEdit?: () => void;
  onAddPhoto?: (photo: Blob) => void;
  onRemovePhoto?: () => void;
  onDelete?: () => void;
}

export default function PlaceDetail({
  place,
  onEdit,
  onAddPhoto,
  onRemovePhoto,
  onDelete,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!place.photo) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(place.photo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [place.photo]);

  const date = new Date(place.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const confirmRemovePhoto = () => {
    if (
      !window.confirm(
        "Remove this photo? The memory stays on the map without an image.",
      )
    )
      return;
    onRemovePhoto?.();
  };

  const confirmDelete = () => {
    if (
      !window.confirm(
        `Delete "${place.title}"? This removes the experience from the map and returns the spot to fog.`,
      )
    )
      return;
    onDelete?.();
  };

  const handlePhotoFile = async (file: File | undefined) => {
    if (!file || !onAddPhoto) return;
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const blob = await compressImage(file);
      onAddPhoto(blob);
    } catch {
      /* ignore — user can retry */
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="pb-2">
      {url ? (
        <div className="relative mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={place.title}
            className="h-56 w-full rounded-2xl border-2 border-ink/10 object-cover"
          />
          {onRemovePhoto && (
            <button
              type="button"
              onClick={confirmRemovePhoto}
              className="absolute right-2 top-2 rounded-lg bg-ink/75 px-3 py-1.5 text-xs font-semibold text-parchment-light backdrop-blur active:translate-y-px"
            >
              Remove photo
            </button>
          )}
        </div>
      ) : onAddPhoto ? (
        <div className="relative mb-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => handlePhotoFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink/15 bg-parchment text-sm text-ink-faint transition hover:border-primary/40 hover:bg-primary/5 active:translate-y-px disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-ink-soft"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="8.5" cy="10" r="1.5" />
              <path d="M21 16l-5-5-7 7" />
            </svg>
            <span>{uploading ? "Adding photo…" : "Tap to add a photo"}</span>
            <span className="text-xs text-ink-faint">camera or gallery</span>
          </button>
        </div>
      ) : (
        <div className="mb-4 flex h-32 w-full items-center justify-center rounded-2xl border-2 border-dashed border-ink/15 bg-parchment text-sm text-ink-faint">
          No photo for this memory
        </div>
      )}

      <div className="flex items-baseline justify-between gap-3">
        <h2 id="detail-title" className="font-hand text-3xl leading-tight text-ink">
          {place.title}
        </h2>
        <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary-deep">
          #{place.order + 1}
        </span>
      </div>

      <p className="mt-1 text-sm text-ink-faint">
        {date}
        {place.location ? ` · ${place.location}` : ` · ${BIOME_LABEL[place.biome]}`} ·{" "}
        {place.companions === "alone" ? "on my own" : "with friends"}
      </p>

      {place.text && (
        <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-ink">
          {place.text}
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
            onClick={confirmDelete}
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
    </div>
  );
}
