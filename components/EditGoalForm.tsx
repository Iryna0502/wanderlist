"use client";

import { useState } from "react";
import type { Companions, Goal } from "@/lib/types";
import PhotoInput from "./PhotoInput";

interface SubmitData {
  title: string;
  text: string;
  location: string;
  companions: Companions;
  photo: Blob | null;
}

interface Props {
  goal: Goal;
  onSubmit: (data: SubmitData) => void;
  onCancel: () => void;
}

/** Edit an unlocked goal's story, photo, and details. */
export default function EditGoalForm({ goal, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(goal.title);
  const [text, setText] = useState(goal.text);
  const [location, setLocation] = useState(goal.location ?? "");
  const [companions, setCompanions] = useState<Companions>(goal.companions);
  const [photo, setPhoto] = useState<Blob | null>(goal.photo);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, text, location, companions, photo });
      }}
      className="pb-2"
    >
      <h2 id="edit-title" className="font-display text-2xl text-ink">
        Edit memory
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Update the story of this goal on your map.
      </p>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Title
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
        Photo
      </label>
      <div className="mt-1">
        <PhotoInput key={goal.id} initialBlob={goal.photo} onChange={setPhoto} />
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
          Save changes
        </button>
      </div>
    </form>
  );
}
