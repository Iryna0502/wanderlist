# Wanderlist

A personal, illustrated map-of-goals web app built with Next.js 14 (App Router), React, TypeScript, Tailwind, and Canvas 2D. See `README.md` for the product overview and standard commands.

## Cursor Cloud specific instructions

- This is a **single, fully client-side product** — there is no backend, database, API, or auth. All data is stored in the browser's **IndexedDB** (`wanderlist` DB). Only one process needs to run for end-to-end testing: the Next.js dev server.
- Standard commands live in `package.json` (`dev`, `build`, `start`, `lint`). Dev server runs at http://localhost:3000.
- Because state lives in IndexedDB, the app's data is per-browser-profile. To reset state during testing, clear the site's IndexedDB / use a fresh browser profile rather than looking for a server-side reset.
- `next lint` and `next build` emit `react-hooks/exhaustive-deps` warnings in `components/UnlockForm.tsx`; these are pre-existing warnings, not errors, and do not fail lint/build.
- The two `scripts/*.mjs` files (`export-figma-map.mjs`, `convert-map.mjs`) are optional, on-demand asset tooling for regenerating the map image (`public/map.webp`). They are NOT part of `dev`/`build`. `export-figma-map.mjs` requires a `FIGMA_TOKEN` env var. Normal development/testing does not need them since the generated asset is already committed.
