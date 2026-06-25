"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compressImage, isHeicFile, isPhotoFile } from "@/lib/image";

interface Props {
  onChange: (blob: Blob | null) => void;
  /** Existing photo blob — shows preview on first render (edit flow). */
  initialBlob?: Blob | null;
}

/** File picker + drag-and-drop, with on-device downscale/compress + preview. */
export default function PhotoInput({ onChange, initialBlob }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Processing your photo…");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialBlob) return;
    const url = URL.createObjectURL(initialBlob);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [initialBlob]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!isPhotoFile(file)) {
        setError("That doesn't look like an image.");
        return;
      }
      setError(null);
      setBusy(true);
      setBusyLabel(
        isHeicFile(file) ? "Converting iPhone photo…" : "Processing your photo…",
      );
      try {
        const blob = await compressImage(file);
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        onChange(blob);
      } catch (err) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Couldn't process that image.",
        );
        onChange(null);
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange],
  );

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,image/heic,image/heif"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`relative flex min-h-[140px] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition ${
          dragging ? "border-primary bg-primary/10" : "border-ink/25 bg-parchment"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Your photo of the moment"
            className="h-44 w-full object-cover"
          />
        ) : (
          <span className="px-4 text-center text-sm text-ink-soft">
            {busy ? busyLabel : "Tap to add a photo"}
            <span className="mt-1 block text-xs text-ink-faint">
              camera or gallery · or drag &amp; drop
            </span>
          </span>
        )}
      </button>
      {preview && (
        <button
          type="button"
          onClick={() => {
            setPreview((old) => {
              if (old) URL.revokeObjectURL(old);
              return null;
            });
            onChange(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="mt-2 text-xs text-ink-soft underline"
        >
          Remove photo
        </button>
      )}
      {error && <p className="mt-2 text-xs text-primary-deep">{error}</p>}
    </div>
  );
}
