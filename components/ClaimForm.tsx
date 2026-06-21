"use client";

import { useState } from "react";
import type { Companions, Place } from "@/lib/types";
import PhotoInput from "./PhotoInput";

interface SubmitData {
  title: string;
  text: string;
  location: string;
  companions: Companions;
  photo: Blob | null;
}

interface Props {
  place?: Place;
  onSubmit: (data: SubmitData) => void;
  onCancel: () => void;
}

export default function ClaimForm({ place, onSubmit, onCancel }: Props) {
  const editing = !!place;
  const [title, setTitle] = useState(place?.title ?? "");
  const [text, setText] = useState(place?.text ?? "");
  const [location, setLocation] = useState(place?.location ?? "");
  const [companions, setCompanions] = useState<Companions>(
    place?.companions ?? "alone",
  );
  const [photo, setPhoto] = useState<Blob | null>(place?.photo ?? null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, text, location, companions, photo });
      }}
      className="pb-2"
    >
      <h2 id={editing ? "edit-title" : "claim-title"} className="font-display text-2xl text-ink">
        {editing ? "Edit memory" : "What did you do here?"}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {editing
          ? "Update the story of this place on your map."
          : "A new experience claims a patch of the map. Tell its story."}
      </p>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Give it a title
      </label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Collected wildflowers"
        maxLength={60}
        className="mt-1 w-full rounded-xl border-2 border-ink/15 bg-parchment px-3 py-3 font-hand text-xl text-ink outline-none placeholder:text-ink-faint focus:border-primary"
      />

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Where was it?
      </label>
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Open field near home"
        maxLength={80}
        className="mt-1 w-full rounded-xl border-2 border-ink/15 bg-parchment px-3 py-3 text-base text-ink outline-none placeholder:text-ink-faint focus:border-primary"
      />

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        What did you do?
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell the story of this moment…"
        rows={3}
        maxLength={600}
        className="mt-1 w-full resize-none rounded-xl border-2 border-ink/15 bg-parchment px-3 py-3 text-base text-ink outline-none placeholder:text-ink-faint focus:border-primary"
      />

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Who was there?
      </label>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {(["alone", "friends"] as Companions[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCompanions(c)}
            className={`min-h-[44px] rounded-xl border-2 px-3 py-2 text-sm font-semibold capitalize transition ${
              companions === c
                ? "border-primary bg-primary text-parchment-light"
                : "border-ink/15 bg-parchment text-ink-soft"
            }`}
          >
            {c === "alone" ? "On my own" : "With friends"}
          </button>
        ))}
      </div>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        A photo of the moment
      </label>
      <div className="mt-1">
        <PhotoInput
          key={place?.id ?? "new"}
          initialBlob={place?.photo}
          onChange={setPhoto}
        />
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[48px] flex-1 rounded-xl border-2 border-ink/15 bg-parchment font-semibold text-ink-soft"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="min-h-[48px] flex-[2] rounded-xl bg-primary font-semibold text-parchment-light shadow-marker active:translate-y-px"
        >
          {editing ? "Save changes" : "✦ Add to map"}
        </button>
      </div>
    </form>
  );
}
