"use client";

import { useEffect, useState } from "react";
import type { Goal } from "@/lib/types";
import DeleteGoalDialog from "./DeleteGoalDialog";
import PhotoInput from "./PhotoInput";

interface Props {
  goal: Goal;
  onSubmit: (data: { photo: Blob; text: string; title: string }) => void;
  onSave: (data: { title: string; text: string; photo: Blob | null }) => void;
  onClose: () => void;
  onDelete: () => void;
}

export default function UnlockForm({ goal, onSubmit, onSave, onClose, onDelete }: Props) {
  const [title, setTitle] = useState(goal.title);
  const [photo, setPhoto] = useState<Blob | null>(goal.photo);
  const [text, setText] = useState(goal.text);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setTitle(goal.title);
    setText(goal.text);
    setPhoto(goal.photo);
    setDeleteOpen(false);
  }, [goal.id]);

  const draft = () => ({
    title: title.trim(),
    text: text.trim(),
    photo,
  });

  const saveDraft = () => {
    const data = draft();
    if (!data.title) {
      setError("Give your experience a title.");
      return false;
    }
    setError(null);
    onSave(data);
    return true;
  };

  useEffect(() => {
    const data = draft();
    if (!data.title) return;
    if (
      data.title === goal.title &&
      data.text === goal.text &&
      data.photo === goal.photo
    ) {
      return;
    }

    const timer = window.setTimeout(() => onSave(data), 400);
    return () => window.clearTimeout(timer);
  }, [title, text, photo, goal.title, goal.text, goal.photo, onSave]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
          setError("Give your experience a title.");
          return;
        }
        if (!photo) {
          setError("Add a photo to complete this experience.");
          return;
        }
        setError(null);
        onSubmit({ photo, text, title: trimmedTitle });
      }}
      className="pb-2"
    >
      <h2 id="unlock-title" className="font-display text-2xl text-ink">
        Complete your experience
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Upload a photo as proof — the lock opens and your memory appears on the map.
      </p>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Experience title
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
        <PhotoInput key={goal.id} initialBlob={goal.photo} onChange={setPhoto} />
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
          onClick={() => {
            if (saveDraft()) onClose();
          }}
          className="min-h-[48px] flex-1 rounded-xl border-2 border-ink/15 bg-parchment font-semibold text-ink-soft"
        >
          Save
        </button>
        <button
          type="submit"
          disabled={!photo}
          className="min-h-[48px] flex-[2] rounded-xl bg-primary font-semibold text-parchment-light shadow-marker active:translate-y-px disabled:opacity-50"
        >
          ✦ Complete experience
        </button>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="text-sm font-semibold text-red-900/75 underline decoration-red-900/25 underline-offset-2 hover:text-red-900"
        >
          Delete experience
        </button>
      </div>

      <DeleteGoalDialog
        open={deleteOpen}
        title="Delete this experience?"
        description={`"${title.trim() || goal.title}" will be removed from the map.`}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          onDelete();
        }}
      />
    </form>
  );
}
