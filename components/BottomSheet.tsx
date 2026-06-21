"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
}

/** A native-feeling bottom sheet that slides up; respects safe-area insets. */
export default function BottomSheet({ open, onClose, children, labelledBy }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative z-10 max-h-[88vh] w-full max-w-md animate-sheet-up overflow-y-auto rounded-t-[28px] border-t-2 border-x-2 border-ink/15 bg-parchment-light shadow-sheet sm:mb-6 sm:rounded-[28px] sm:border-2"
        style={{
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="sticky top-0 z-10 flex justify-center bg-gradient-to-b from-parchment-light to-transparent pb-1 pt-3">
          <span className="h-1.5 w-12 rounded-full bg-ink/25" />
        </div>
        <div className="px-5 pb-2">{children}</div>
      </div>
    </div>
  );
}
