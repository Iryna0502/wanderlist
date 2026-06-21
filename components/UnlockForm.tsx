"use client";

import { useState } from "react";
import type { Goal } from "@/lib/types";
import PhotoInput from "./PhotoInput";

interface Props {
  goal: Goal;
  onSubmit: (data: { photo: Blob; text: string; title: string }) => void;
  onCancel: () => void;
}

export default function UnlockForm({ goal, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(goal.title);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
          setError("Give your goal a title.");
          return;
        }
        if (!photo) {
          setError("Add a photo to complete this goal.");
          return;
        }
        setError(null);
        onSubmit({ photo, text, title: trimmedTitle });
      }}
      className="pb-2"
    >
      <h2 id="unlock-title" className="font-display text-2xl text-ink">
        Complete your goal
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Upload a photo as proof — the lock opens and your memory appears on the map.
      </p>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Goal title
      </label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={60}
        className="mt-1 w-full rounded-xl border-2 border-ink/15 bg-parchment px-3 py-3 font-hand text-xl text-ink outline-none placeholder:text-ink-faint focus:border-primary"
      />
      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Proof photo
      </label>
      <div className="mt-1">
        <PhotoInput onChange={setPhoto} />
      </div>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Notes <span className="font-normal normal-case text-ink-faint">(optional)</span>
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="How did it go?"
        rows={2}
        maxLength={600}
        className="mt-1 w-full resize-none rounded-xl border-2 border-ink/15 bg-parchment px-3 py-3 text-base text-ink outline-none placeholder:text-ink-faint focus:border-primary"
      />

      {error && <p className="mt-2 text-xs text-primary-deep">{error}</p>}

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
          ✦ Complete goal
        </button>
      </div>
    </form>
  );
}
