# Car Comparer — Design

> **Status:** Phase 1 is built, along with the parametric 3D view from Phase 2
> (see [README.md](README.md)). Decisions so far: web app, free (parametric
> models + hand-entered data), current car is a 2019 RAV4 Hybrid XLE, and
> mirrors are **not** folded, so fit checks use the mirrors-out width.

## 1. The one job

**Answer "will this car fit in my garage, and by how much?" at a glance.**

Everything else, including the stats comparison, is secondary. So the design
is built around one rule:

> **The published dimensions are the source of truth. The 3D model is how
> they're shown, not where they come from.**

A good-looking mesh that's 3 inches off is worse than a plain box that's
exact. Every number on screen comes from the spec data, and every model is
scaled to match that data before it's drawn.

## 2. Core user flow

1. **Set up my garage** (once, saved on the device): interior width and
   depth, door opening width and height, and optional obstacles (steps,
   workbench, water heater, shelving, a second parked car).
2. **Pick my current car** (the baseline, saved).
3. **Pick a candidate car.**
4. **See the overlay**: the candidate drawn over my current car, with the
   difference called out on every side, and both placed in my garage with
   the clearance left on every side.

The whole thing should work on a phone standing in the garage.

## 3. Screens

### 3.1 Compare view (the main screen)

```
┌───────────────────────────────────────────────────────────┐
│  [Current: 2019 Honda CR-V ▾]   vs   [Candidate: … ▾]     │
│  View: (Top) (Side) (Front) (3D)   Align: (Rear) Front Ctr │
├───────────────────────────────────────────────────────────┤
│                                                           │
│          ┌─────────────── +7.3 in ───────────────┐        │
│      ┌ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ┐    │
│ +1.4 │   │   current (solid)                     │   │    │
│  in  │   │                                       │   │    │
│      └ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ┘    │
│          └───────────────────────────────────────┘        │
│               candidate (ghost outline)                   │
├───────────────────────────────────────────────────────────┤
│  Length  +7.3 in   Width  +2.8 in (+1.4 each side)        │
│  Height  −1.2 in   Mirrors +3.1 in   Wheelbase +4.0 in    │
└───────────────────────────────────────────────────────────┘
```

- **Views:** Top (default, it's the one that matters for a garage), Side,
  Front, and a free-orbit 3D view. Top/Side/Front use an **orthographic**
  camera so nothing is distorted by perspective; a ruler you'd hold up to
  the screen would agree with the numbers.
- **Overlay styles:** *Ghost* (candidate as a translucent shell over the
  solid current car), *Outline* (candidate as a crisp coloured outline), and
  *Side by side*.
- **Alignment anchor** — this changes the answer, so it's a visible control:
  - *Rear bumper* (default) — how you'd back up to / pull in against a wall.
  - *Front bumper* — how you'd pull in nose-first to a wall stop.
  - *Center* and *Rear axle* for general comparison.
- **Delta callouts:** dimension lines on every side labelled with the signed
  difference (`+1.4 in`, `−0.6 in`). Width is shown both as a total and
  per side, since per side is what you actually feel in a garage.
- **Colour meaning:** green = candidate smaller, amber = bigger but still
  fits, red = doesn't fit / breaks a clearance you set.

### 3.2 Garage view

Same canvas, with the garage walls, door opening and obstacles drawn in, and
the candidate (optionally with the current car as a ghost) parked inside.

- **Clearance readouts** on all four sides of the car, to the nearest wall
  or obstacle.
- **Door-open check:** draws the door swing arc for the driver (and
  optionally passenger) door and warns if it hits a wall or the other car.
  In practice this is often the real limit, more than the car's width.
- **Height checks:** roof vs. the garage door opening, and **open
  liftgate/trunk height** vs. the ceiling or the lifted door track.
- **Drag to park:** move the car inside the garage; clearances update live.
  "Snap to where I park now" puts it where your current car sits.
- **Two-car garages:** place a second, fixed car and check the gap between
  them.

### 3.3 Car picker

Search by year / make / model / trim. Recent picks at the top. Trim matters:
the same model can differ by several inches between trims, so the picker
always resolves to a specific trim before comparing.

**"Enter dimensions manually"** is always available, for a car that isn't in
the data or when you've measured your own car with a tape measure (the most
accurate source there is for the car you already own).

### 3.4 Stats comparison (secondary)

A simple two-column table with a signed difference column: length, width
(with and without mirrors), height, wheelbase, track, ground clearance,
turning circle, curb weight, cargo volume, and if the data has them,
horsepower, MPG / range, and price. Differences bigger than a threshold get
highlighted.

### 3.5 Garage setup

A form with a live top-down preview. Fields: interior width, interior depth,
door opening width and height, ceiling height, and a list of obstacles, each
a rectangle with position, size and height. A short "how to measure" guide
(measure at the narrowest point, including the door frame and any steps).

## 4. Dimensions: what we store and why

Published specs hide a few traps for garage fitting, so the data model
names them explicitly rather than having one "width":

| Field | Why it matters |
|---|---|
| `length` | bumper to bumper |
| `widthBody` | what most US spec sheets call "width", **excluding** mirrors |
| `widthMirrorsOut` | many EU sheets publish this; the true widest point when driving in |
| `widthMirrorsFolded` | what matters once parked, if the mirrors fold |
| `height` | check whether it includes roof rails; store `heightIncludesRails` |
| `heightLiftgateOpen` | can you open the back without hitting the ceiling or door track |
| `wheelbase`, `frontOverhang`, `rearOverhang` | for drawing a believable silhouette and axle alignment |
| `trackFront`, `trackRear` | wheel placement in the model |
| `groundClearance` | steps and garage-floor ramps |
| `turningCircle` | tight driveways (nice to have) |
| `doorLengthFront`, `doorOpenAngle` | door swing check (often estimated) |

Every car record also carries **where its numbers came from** (manufacturer
spec sheet URL, API name, "measured by me") so a surprising result can be
checked. Missing fields are shown as "unknown", never guessed silently; where
the app does estimate one (e.g. mirror width from body width), it says so.

**Units:** store millimetres internally (manufacturers' native unit, no
rounding drift), display in inches, feet + inches, or cm, the user's choice.
Differences are shown to 0.1 in / 1 mm.

### 4.1 Data types (sketch)

```ts
type Mm = number

interface CarSpec {
  id: string                // "honda-cr-v-2019-ex"
  year: number
  make: string
  model: string
  trim: string
  bodyType: 'sedan' | 'hatchback' | 'suv' | 'crossover' | 'truck' | 'van' | 'coupe' | 'wagon'
  length: Mm
  widthBody: Mm
  widthMirrorsOut?: Mm
  widthMirrorsFolded?: Mm
  height: Mm
  heightIncludesRails?: boolean
  heightLiftgateOpen?: Mm
  wheelbase: Mm
  frontOverhang?: Mm
  rearOverhang?: Mm
  trackFront?: Mm
  trackRear?: Mm
  groundClearance?: Mm
  turningCircle?: Mm
  doorLengthFront?: Mm
  stats?: Record<string, number | string>   // hp, mpg, weight, cargo… (secondary)
  model3d?: { url: string; license: string; attribution?: string }
  sources: { field: string | '*'; source: string; url?: string }[]
}

interface Garage {
  name: string
  interiorWidth: Mm
  interiorDepth: Mm
  ceilingHeight: Mm
  door: { offsetFromLeft: Mm; width: Mm; height: Mm }
  obstacles: { label: string; x: Mm; y: Mm; w: Mm; d: Mm; h: Mm }[]
  parkedCars: { carId: string; x: Mm; y: Mm; headingDeg: number }[]
}
```

## 5. Where the data comes from

There is no single free, complete, accurate source of car dimensions, so the
app is built to take several and lets a hand-entered number override
anything.

1. **Curated JSON in the repo (MVP).** Start with your current car and the
   handful of candidates you're actually considering, entered from the
   manufacturer spec sheets. Personal use needs tens of cars, not
   thousands, and this is the most accurate route.
2. **Your own tape measure** for the car you already own, entered through
   the manual form. Beats any spec sheet.
3. **A dimensions API later** to widen coverage. Candidates to evaluate
   (check current pricing, coverage and terms before committing): CarAPI,
   CarQuery, and NHTSA vPIC for VIN → year/make/model/trim lookup (vPIC is
   free but rarely has dimensions, so it pairs with one of the others).
   Avoid scraping spec sites; most forbid it and it breaks.

## 6. The 3D models

This is the hardest part of the brief, and the plan is to never be blocked
by it.

### 6.1 Tier 1: parametric model (always available)

Generate a car body **from the dimensions alone**: a smoothed body shell
shaped by `bodyType` (sedan, SUV, truck profiles), wheels placed from
wheelbase, overhangs and track, a glasshouse, and mirrors sized from the
mirror width. It won't look like the actual car, but it's **exactly** the
right size and every car in the data has one. This is what the MVP ships.

### 6.2 Tier 2: real meshes (glTF / .glb)

For a realistic look, load a real model per car where one exists:

- **Sources:** Sketchfab (many downloadable models, **licence varies per
  model**, so only use CC-BY / CC0 or bought ones, and show attribution),
  and paid libraries of accurately modelled cars such as Hum3D or
  TurboSquid for the cars you care about. Check each model's licence
  before shipping it in a public app.
- **Normalising to the spec:** on load, measure the mesh's bounding box,
  work out which way is forward / up, then scale it so its bounding box
  equals the spec's `length × widthMirrorsOut (or widthBody) × height`.
  If the mesh's own proportions are off by more than ~2%, flag the model as
  inaccurate rather than silently stretching it.
- **Pipeline:** a small script (`scripts/import-model.ts`) that takes a
  downloaded model, orients it, strips interior geometry, Draco-compresses
  it with `gltf-transform`, and writes the `.glb` plus its calibration into
  the car's record.
- **Lazy loading:** meshes are several MB, so they load on demand, with the
  parametric model shown until they arrive.

### 6.3 Rendering

- **three.js** via **@react-three/fiber** and **@react-three/drei**
  (orbit controls, orthographic camera, environment lighting, `<Html>` for
  the dimension labels).
- The ghost overlay is the candidate mesh drawn with a transparent material
  plus an edge outline, rendered after the solid car so both stay readable.
- Dimension lines and garage walls are plain three.js lines in the same
  scene, in millimetres, so the geometry and the labels can't disagree.

## 7. Tech stack

| Concern | Choice | Why |
|---|---|---|
| App | Vite + React + TypeScript | same as Mathlete: known tooling, easy move |
| 3D | three.js, @react-three/fiber, drei | the standard for 3D in React |
| State | React context + reducer (or Zustand) | small app, few moving parts |
| Storage | `localStorage` for garage, current car, units | no account needed; export/import JSON for backup |
| Data | static JSON in `src/data/cars/` | no backend for MVP |
| Hosting | GitHub Pages, same workflow as Mathlete | free, already proven |
| Mobile | installable PWA | use it on a phone in the garage |
| Lint | oxlint | same as Mathlete |

No backend until the app needs a dimensions API with a secret key; at that
point a tiny proxy (e.g. a Cloudflare Worker) keeps the key out of the
browser.

## 8. Proposed layout

```
car-comparer/
  src/
    data/cars/*.json          one file per car/trim
    data/schema.ts            CarSpec, Garage types + validation
    geometry/
      units.ts                mm ↔ in / ft-in / cm, formatting
      compare.ts              deltas per side for a given anchor (pure, unit-tested)
      fit.ts                  garage clearances, door swing, height checks (pure, unit-tested)
      parametric.ts           dimensions → car body geometry
    scene/
      CarModel.tsx            parametric or glb, normalised to spec
      Overlay.tsx             ghost / outline / side-by-side
      DimensionLines.tsx      callouts with signed deltas
      GarageScene.tsx         walls, door, obstacles, parked cars
    screens/
      Compare.tsx  Garage.tsx  CarPicker.tsx  GarageSetup.tsx  Stats.tsx
  scripts/import-model.ts     mesh orient + scale + compress
  public/models/*.glb
```

The maths (`compare.ts`, `fit.ts`, `units.ts`) is kept as pure functions
with no three.js in it, so it can be unit-tested (Vitest) independently of
the rendering. That's where a wrong answer would hurt, so that's where the
tests go.

## 9. Build plan

**Phase 1: Fits or not (MVP)**
- Car data schema + 5–10 hand-entered cars (yours + candidates)
- Manual "enter dimensions" form
- Top / Side / Front orthographic views with **box outlines** and delta callouts
- Alignment anchors; unit toggle
- Garage setup + garage view with clearances
- Saved garage and current car

**Phase 2: Looks like a car**
- Parametric car bodies by body type
- 3D orbit view, ghost overlay
- Door swing and liftgate height checks
- Drag to park; PWA install

**Phase 3: Looks like *that* car**
- glb import pipeline + spec normalisation + accuracy flag
- Real models for your shortlist
- Attribution / licence display

**Phase 4: Secondary features**
- Stats comparison table
- Dimensions API behind a small proxy; VIN lookup
- Shareable comparison links (state in the URL)
- Compare 3+ cars

## 10. Open questions for you

1. **Web app OK?** A PWA gets you phone + desktop from one codebase with no
   app store. A native iOS/Android app would add AR ("place the car in my
   real garage through the camera"), which is a compelling Phase 5, but
   it's a lot more work up front.
2. **Your garage and current car:** if you share the numbers (and your
   current car's year/make/model/trim), they become the first test fixture
   and the first data in the app.
3. **Budget for models/data:** are you OK paying for a few accurate 3D
   models or an API tier, or should this stay free (parametric models +
   hand-entered data)?
4. **Mirrors:** do you fold your mirrors when parked? That decides which
   width the "fits" check uses by default.
