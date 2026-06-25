"use client";

interface Props {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteGoalDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Cancel delete"
        onClick={onCancel}
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-desc"
        className="relative w-full max-w-sm animate-fade-in rounded-2xl border-2 border-ink/15 bg-parchment-light p-5 shadow-sheet"
      >
        <h3 id="delete-title" className="font-display text-xl text-ink">
          {title}
        </h3>
        <p id="delete-desc" className="mt-2 text-sm leading-relaxed text-ink-soft">
          {description}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] flex-1 rounded-xl border-2 border-ink/15 bg-parchment font-semibold text-ink-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] flex-1 rounded-xl bg-red-900/90 font-semibold text-parchment-light active:translate-y-px"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
