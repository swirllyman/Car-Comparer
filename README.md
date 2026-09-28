# Car Comparer 🚗

Overlay two cars at true scale and see whether the new one fits your garage,
and by how much, on every side.

See [DESIGN.md](DESIGN.md) for the full design and roadmap.

## Hosting

Every push to the default branch runs lint, tests and the build, then
publishes to GitHub Pages via `.github/workflows/deploy.yml`. Pages must be
switched on once under **Settings → Pages → Source: GitHub Actions**.

## Run it

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # the fit/compare maths
npm run build
```

## What's here (Phase 1 + early Phase 2)

- **Top / Side / Front** overlays, drawn in millimetres with a flat
  (orthographic) projection, with signed differences on every side. Line the
  cars up by rear bumpers, front bumpers or centres.
- **3D** orbit view: the same cars as extruded bodies, sized exactly to spec.
- **Garage**: enter your garage and where your car sits, then see the new car
  parked in the same spot with the clearance to every wall and obstacle,
  room to open each door, whether the garage door closes, and the
  doorway width/height when driving in. Drag the car to re-park it.
- **Search** ~110 cars (about 60 of them EVs) by make, model, year or type,
  with each result's size against your car and whether it fits your garage.
- **Charge ports** for EVs: shown on the drawings, and with a wall charger
  set in the garage, the cable length needed to reach the port (routed around
  the car) against your cable. Locations from a single or indirect source are
  marked "unconfirmed".
- **Edit dimensions** on any car, or add your own. Tape-measured numbers for
  your own car beat any spec sheet.
- Everything is saved in the browser on this device.

## Where the numbers come from

`src/data/cars.ts` is a small starter list gathered from published spec
summaries. Mirror widths are the least reliable figure: where one is missing
the app estimates it and marks it `est.` Widths default to **mirrors out**.

## Layout

```
src/geometry/   pure maths: units, compare, fit, car silhouettes (unit-tested)
src/components/ SVG drawings, garage view, forms
src/scene/      three.js 3D view (lazy-loaded)
src/data/       car data, types, saved state
```
