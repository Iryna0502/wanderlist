# Wanderlist

An endless, explorable map of a life. Every real-world experience you live becomes
a discovered place on an infinite illustrated world map. Undiscovered places sit
hidden under drifting fog — tap the fog to **claim** a place: write what you did,
attach a photo, and note whether you were alone or with friends. The fog dissolves,
a cozy campsite appears, its campfire lights, and **a new fog spot rises nearby in
unexplored space** — so the map keeps growing alongside your life. A dotted trail
links your discoveries in order: the path of a life.

It runs **entirely on-device** — no backend, no database, no auth, no accounts.

---

## Run & deploy

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to ./out
```

The app is a fully static, client-side Next.js 14 app (`output: "export"`).
Deploy the generated `out/` folder to any static host. On **Vercel**, just import
the repo — no configuration, no API routes, no environment variables needed.

> First build fetches the Google fonts (Cinzel / Caveat / Nunito) via `next/font`,
> which self-hosts them — so the deployed app needs no runtime font network calls.

---

## How the procedural map works

The world is **generated, never stored**. The same coordinates always regenerate
the same terrain, in every direction, with no edges and no repetition.

- **Deterministic hashing** (`lib/noise.ts`). A fast integer hash turns any
  `(x, y)` into a stable pseudo-random value. Layered ("fractal") value noise with
  smoothstep interpolation builds smooth continuous fields from that hash.
- **Biomes** (`lib/biome.ts`). Two low-frequency noise fields — **elevation** and
  **moisture** — are sampled at each world point. The pair maps to a biome:
  `water · meadow · forest · hills · peaks`. Low frequency ⇒ large coherent regions
  (oceans, forests) instead of static.
- **Tiles & culling** (`lib/render.ts`). The world is divided into tiles
  (`TILE` world units). Each tile deterministically scatters its own decorations
  (pines, mountains, grass, flowers, ripples) from its hash. Only what's on screen
  is computed and drawn — terrain is sampled in screen space, so detail
  automatically scales with zoom (cheap LOD), and decorations/markers off-screen
  are skipped.
- **Painterly look.** Terrain colour is a continuous elevation/moisture ramp
  (so shorelines and slopes blend smoothly rather than looking blocky), with soft
  shoreline foam, a shadow the coast casts onto the water, drifting cloud shadows
  on a slower parallax layer, animated campfire flames, shimmering water, and
  drifting fog.

### Why `<canvas>` (not SVG)

At any moment the screen holds hundreds–thousands of animated elements (terrain
cells, trees, ripples, flickering fires, drifting fog). As an SVG/DOM tree that's
thousands of nodes re-laid-out every frame. A single `<canvas>` redrawn in one
`requestAnimationFrame` loop animates all of it cheaply and pans/zooms smoothly.

### The growth rule

When you claim a fog spot it becomes a campsite, and `spawnNearbyFog`
(`lib/spawn.ts`) deterministically searches outward for an **on-land**, well-spaced
point in unexplored space and raises fresh fog there. Discover → the frontier moves.

---

## Storage model — everything on-device

Persistence lives in **IndexedDB** (`lib/storage.ts`).

**Why IndexedDB over localStorage:** localStorage is capped near ~5&nbsp;MB and only
stores strings, so photos must be base64-encoded (≈ +33% size) — a handful of
snapshots and you're out of room. IndexedDB stores photo **Blobs** natively with a
far larger quota, so the map of a life can actually keep growing. The tradeoff is an
asynchronous API, which is wrapped in a small promise helper here.

- **Photos** are uploaded from the device (file picker, which opens camera/gallery
  on mobile; drag-and-drop on desktop). Before saving, each photo is **downscaled to
  a 900px long edge and re-encoded as JPEG (`lib/image.ts`)**, keeping memories to
  tens of KB.
- **First visit** seeds 2–3 example discovered places (with generated gradient
  photos) plus a few fog spots so the map isn't empty (`lib/seed.ts`).
- **Start over** wipes IndexedDB and re-seeds.

---

## Interactions

- **Drag** to pan freely in any direction.
- **Pinch** to zoom on touch; **wheel** to zoom on desktop (both zoom toward the
  pointer).
- **Tap fog** → claim form (bottom sheet). **Tap a campsite** → detail view with the
  photo, story, and who was there.
- **Recenter** button glides the camera back to your most recent discovery.
- **Live counter** of places discovered.
- Claiming plays a reveal animation (fog dissolves, tent pops in, campfire lights,
  camera glides to it). All motion respects `prefers-reduced-motion`.

## Mobile-first

Designed for a phone in portrait: ≥44px touch targets, thumb-reachable controls
bottom-right, claim/detail UI as a slide-up bottom sheet, `env(safe-area-inset-*)`
handling for notch/home-bar, and page zoom/overscroll disabled so the map owns all
gestures. It scales up gracefully to desktop.

---

## Project structure

```
app/
  layout.tsx        Fonts, viewport (zoom disabled, safe-area), shell
  page.tsx          State wiring: map + HUD + bottom sheets
  globals.css       Parchment texture, frame, reduced-motion
lib/
  types.ts          Place / FogSpot / WorldState / Camera
  noise.ts          Hashing, value noise, fBm, seeded PRNG
  biome.ts          Elevation/moisture → biome, palette, TILE size
  camera.ts         World ↔ screen transforms, zoom clamps, culling bounds
  render.ts         The whole canvas scene (terrain, water, fog, camps, trail)
  storage.ts        IndexedDB persistence
  image.ts          On-device downscale + JPEG compression
  seed.ts           First-visit example world
  spawn.ts          The "new fog rises nearby" growth rule
hooks/
  usePlaces.ts      Load/seed/persist world; claim + reset
components/
  MapCanvas.tsx     Canvas, rAF loop, pan/zoom/pinch, hit-testing, camera anim
  Hud.tsx           Title, counter, compass rose, zoom/recenter/reset
  BottomSheet.tsx   Reusable safe-area bottom sheet
  ClaimForm.tsx     Claim a place
  PlaceDetail.tsx   View a discovery
  PhotoInput.tsx    Picker + drag/drop + compress + preview
```

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind CSS · HTML Canvas 2D.
No runtime dependencies beyond React/Next.
