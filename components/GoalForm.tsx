"use client";

import { useState } from "react";

interface Props {
  onSubmit: (title: string) => void;
  onCancel: () => void;
}

export default function GoalForm({ onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
      }}
      className="pb-2"
    >
      <h2 id="add-experience-title" className="font-display text-2xl text-ink">
        New experience
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Name something you want to do. It appears on the map as a locked spot until
        you complete it with a photo.
      </p>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Experience title
      </label>
      <input
        autoFocus
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Learn to surf"
        maxLength={60}
        className="mt-1 w-full rounded-xl border-2 border-ink/15 bg-parchment px-3 py-3 font-hand text-xl text-ink outline-none placeholder:text-ink-faint focus:border-primary"
      />

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
          disabled={!title.trim()}
          className="min-h-[48px] flex-[2] rounded-xl bg-primary font-semibold text-parchment-light shadow-marker active:translate-y-px disabled:opacity-50"
        >
          Add to map
        </button>
      </div>
    </form>
  );
}
