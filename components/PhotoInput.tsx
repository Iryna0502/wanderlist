"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { compressImage, isHeicFile, isPhotoFile } from "@/lib/image";

interface Props {
  onChange: (blob: Blob | null) => void;
  /** Existing photo blob — shows preview on first render (edit flow). */
  initialBlob?: Blob | null;
}

/** File picker + drag-and-drop, with on-device downscale/compress + preview. */
export default function PhotoInput({ onChange, initialBlob }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [heicUpload, setHeicUpload] = useState(false);
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
      const heic = isHeicFile(file);
      setHeicUpload(heic);
      setBusy(true);
      setBusyLabel(
        heic ? "Converting iPhone photo…" : "Processing your photo…",
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
        setHeicUpload(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange],
  );

  return (
    <div>
      <label
        htmlFor={inputId}
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
        className={`relative flex min-h-[140px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition ${
          dragging ? "border-primary bg-primary/10" : "border-ink/25 bg-parchment"
        } ${busy ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          aria-label="Choose a photo from your gallery or camera"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
          }}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Your photo of the moment"
            className="pointer-events-none h-44 w-full object-cover"
          />
        ) : (
          <span className="pointer-events-none flex flex-col items-center gap-2 px-4 text-center text-sm text-ink-soft">
            {busy && heicUpload && (
              <span
                className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-ink/20 border-t-primary"
                aria-hidden
              />
            )}
            <span>{busy ? busyLabel : "Tap to add a photo"}</span>
            {busy && heicUpload ? (
              <span className="text-xs text-ink-faint">
                Large photos can take up to a minute.
              </span>
            ) : (
              !busy && (
                <span className="text-xs text-ink-faint">
                  photo library or camera · or drag &amp; drop
                </span>
              )
            )}
          </span>
        )}
      </label>
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
