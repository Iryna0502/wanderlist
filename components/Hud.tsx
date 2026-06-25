"use client";

interface Props {
  completedCount: number;
  totalCount: number;
  onAddExperience: () => void;
  onRecenter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const ico = "h-5 w-5";
function Icon({ name }: { name: string }) {
  const common = {
    className: ico,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-5L6 9.4l4.4-1.6z" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      );
    default:
      return <svg {...common} />;
  }
}

export default function Hud({
  completedCount,
  totalCount,
  onAddExperience,
  onRecenter,
  onZoomIn,
  onZoomOut,
}: Props) {
  const progress =
    totalCount > 0 ? Math.min(1, completedCount / totalCount) : 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Top bar */}
      <div
        className="absolute inset-x-0 top-0 flex justify-center p-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="pointer-events-auto flex flex-col items-center rounded-2xl border border-ink/10 bg-parchment-light/90 px-4 py-2 text-center shadow-marker backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-primary">
              <Icon name="spark" />
            </span>
            <h1 className="font-display text-xl leading-none text-ink">Wanderlist</h1>
            <span className="text-primary">
              <Icon name="spark" />
            </span>
          </div>
          <div className="mt-2 w-full min-w-[10rem]">
            <div className="flex items-baseline justify-between gap-3 text-[11px] font-semibold tabular-nums text-ink-soft">
              <span>
                {completedCount}/{totalCount} experiences
              </span>
              <span className="font-normal text-ink-faint">
                {totalCount > 0
                  ? `${Math.round(progress * 100)}%`
                  : "—"}
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10"
              role="progressbar"
              aria-valuenow={completedCount}
              aria-valuemin={0}
              aria-valuemax={Math.max(totalCount, 1)}
              aria-label={`${completedCount} of ${totalCount} experiences completed`}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-tight text-ink-faint">
              a map of experiences by{" "}
              <a
                href="https://www.instagram.com/iryna_lupan/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ink-soft underline decoration-ink/25 underline-offset-2 hover:text-primary hover:decoration-primary/40"
              >
                @iryna_lupan
              </a>
            </p>
        </div>
      </div>

      {/* Zoom / recenter */}
      <div
        className="pointer-events-auto absolute right-3 flex flex-col items-center gap-2"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
      >
        <button
          onClick={onZoomIn}
          aria-label="Zoom in"
          className="grid h-11 w-11 place-items-center rounded-full border border-ink/10 bg-parchment-light/90 text-ink shadow-marker backdrop-blur active:translate-y-px"
        >
          <Icon name="plus" />
        </button>
        <button
          onClick={onZoomOut}
          aria-label="Zoom out"
          className="grid h-11 w-11 place-items-center rounded-full border border-ink/10 bg-parchment-light/90 text-ink shadow-marker backdrop-blur active:translate-y-px"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M6 12h12" />
          </svg>
        </button>
        <button
          onClick={onRecenter}
          aria-label="Go to next experience on the map"
          className="grid h-11 w-11 place-items-center rounded-full border border-ink/10 bg-primary text-parchment-light shadow-marker active:translate-y-px"
        >
          <Icon name="target" />
        </button>
      </div>

      {/* Add experience pill */}
      <div
        className="absolute inset-x-0 flex justify-center px-4"
        style={{ bottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={onAddExperience}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-semibold text-parchment-light shadow-marker transition active:translate-y-px"
        >
          <Icon name="plus" /> Add new experience
        </button>
      </div>
    </div>
  );
}
