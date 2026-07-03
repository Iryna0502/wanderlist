"use client";

/** Gentle first-visit nudge — shown only while the map has no experiences yet. */
export default function OnboardingHint() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[15] flex justify-center px-6 animate-fade-in"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 7.5rem)" }}
      aria-live="polite"
    >
      <p className="max-w-xs rounded-2xl border border-ink/10 bg-parchment-light/88 px-5 py-3 text-center font-hand text-[1.35rem] leading-snug text-ink shadow-marker backdrop-blur-sm">
        Add your first experience to begin. Unlock it with a photo.
      </p>
    </div>
  );
}
