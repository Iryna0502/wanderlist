# Wanderlist

A personal, illustrated map of goals and memories — built with Next.js 14, React, and Canvas 2D. Everything stays on your device (IndexedDB).

## How it works

1. **Add a goal** — give it a title; it appears on the map as a locked marker.
2. **Complete it** — tap the lock, upload a photo (HEIC supported), and unlock the goal.
3. **Explore** — unlocked goals show a campfire and polaroid; a dotted trail connects them in order.

Pan and pinch to explore the hand-drawn map. Tap an unlocked goal to read its story, edit details, or delete it.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data

- **Goals** — `locked` (title only) or `unlocked` (photo + story).
- **Storage** — IndexedDB (`wanderlist`), schema v2. Older saves with “places” and fog are migrated automatically: completed places become unlocked goals; empty fog slots are dropped.

## Stack

- Next.js 14 (App Router, static export friendly)
- TypeScript
- Tailwind CSS
- Canvas 2D rendering (`lib/render.ts`)
