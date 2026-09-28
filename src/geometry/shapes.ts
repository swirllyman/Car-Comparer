import type { BodyType, Mm, ResolvedCar } from '../data/types'

/**
 * Car silhouettes built from the dimensions alone. Each outline is exactly
 * as long, wide and tall as the spec — the shape inside that box is a
 * body-type approximation, not the real car's styling.
 */

export type Pt = [number, number]

/** Chaikin corner-cutting: turns a rough polygon into a smooth closed curve. */
export function smooth(points: Pt[], iterations = 3): Pt[] {
  let pts = points
  for (let i = 0; i < iterations; i++) {
    const next: Pt[] = []
    for (let j = 0; j < pts.length; j++) {
      const [x0, y0] = pts[j]
      const [x1, y1] = pts[(j + 1) % pts.length]
      next.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1])
    }
    pts = next
  }
  return pts
}

export const toPath = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`

/**
 * Side profiles: u runs front bumper (0) to rear bumper (1), v is the
 * fraction of overall height. The underside is added from ground clearance.
 * Chaikin shrinks a shape slightly, so the outline is re-stretched to the
 * exact extents afterwards.
 */
const PROFILES: Record<BodyType, Pt[]> = {
  sedan: [[0, 0.42], [0.005, 0.55], [0.03, 0.62], [0.26, 0.66], [0.3, 0.67], [0.44, 0.96], [0.5, 1], [0.66, 0.99], [0.8, 0.72], [0.97, 0.7], [0.995, 0.62], [1, 0.42]],
  hatchback: [[0, 0.42], [0.005, 0.55], [0.03, 0.62], [0.24, 0.66], [0.28, 0.67], [0.42, 0.96], [0.48, 1], [0.84, 0.98], [0.96, 0.88], [0.99, 0.7], [1, 0.42]],
  wagon: [[0, 0.42], [0.005, 0.55], [0.03, 0.62], [0.24, 0.66], [0.28, 0.67], [0.4, 0.96], [0.46, 1], [0.9, 0.98], [0.98, 0.9], [0.995, 0.7], [1, 0.42]],
  suv: [[0, 0.45], [0.005, 0.6], [0.03, 0.68], [0.26, 0.71], [0.3, 0.72], [0.42, 0.97], [0.47, 1], [0.9, 0.99], [0.975, 0.93], [0.995, 0.75], [1, 0.45]],
  minivan: [[0, 0.42], [0.005, 0.52], [0.04, 0.58], [0.14, 0.62], [0.18, 0.64], [0.34, 0.96], [0.4, 1], [0.92, 0.99], [0.985, 0.93], [0.998, 0.7], [1, 0.42]],
  truck: [[0, 0.5], [0.005, 0.66], [0.03, 0.74], [0.24, 0.77], [0.28, 0.78], [0.36, 0.97], [0.4, 1], [0.55, 1], [0.565, 0.97], [0.57, 0.76], [0.995, 0.76], [1, 0.5]],
}

/** Height (fraction of overall) of the line where the windows start. */
const BELT: Record<BodyType, number> = { sedan: 0.66, hatchback: 0.65, wagon: 0.65, suv: 0.7, minivan: 0.62, truck: 0.8 }

export const beltHeight = (car: ResolvedCar): Mm => BELT[car.bodyType] * car.height

/** Where the windscreen meets the hood, and where the glass ends at the back (as u). */
export function glassSpan(bodyType: BodyType): [number, number] {
  const p = PROFILES[bodyType]
  const first = p.findIndex(([, v]) => v >= 0.95)
  const last = p.findLastIndex(([, v]) => v >= 0.95)
  return [p[first - 1][0], p[Math.min(last + 1, p.length - 1)][0]]
}

/** Door mirrors sit just behind the base of the windscreen. */
export function mirrorY(car: ResolvedCar): Mm {
  return glassSpan(car.bodyType)[0] * car.length + 60
}
export const MIRROR_DEPTH: Mm = 220

/** Keep the part of a closed polygon above (or below) the line y = cut. */
export function clipY(pts: Pt[], cut: number, keep: 'above' | 'below'): Pt[] {
  const inside = ([, y]: Pt) => (keep === 'above' ? y >= cut : y <= cut)
  const out: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    if (inside(a)) out.push(a)
    if (inside(a) !== inside(b)) {
      const t = (cut - a[1]) / (b[1] - a[1])
      out.push([a[0] + t * (b[0] - a[0]), cut])
    }
  }
  return out
}

/** Stretch points so their bounding box is exactly [x0,x1]×[y0,y1]. */
function fitTo(pts: Pt[], x0: number, x1: number, y0: number, y1: number): Pt[] {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const [ax, bx, ay, by] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  return pts.map(([x, y]) => [x0 + ((x - ax) / (bx - ax)) * (x1 - x0), y0 + ((y - ay) / (by - ay)) * (y1 - y0)])
}

export function wheelRadius(car: ResolvedCar): Mm {
  return Math.min(430, Math.max(300, car.height * 0.22))
}

/**
 * Side view in car coordinates: x from the front bumper toward the rear,
 * y *up* from the ground. Callers flip y for SVG.
 */
export function sideProfile(car: ResolvedCar): Pt[] {
  const g = car.groundClearance
  const r = wheelRadius(car)
  // Bumpers hang lower than the sills; keep them just above wheel-centre height at worst.
  const bumper = Math.min(g + 80, r) / car.height
  const top = PROFILES[car.bodyType]
  const pts: Pt[] = [...top, [0.99, bumper], [0.9, g / car.height], [0.1, g / car.height], [0.01, bumper]]
  return fitTo(smooth(pts, 2), 0, car.length, g, car.height)
}

/** The window band: the side profile above the belt line. */
export function sideGlass(car: ResolvedCar): Pt[] {
  return clipY(sideProfile(car), beltHeight(car), 'above')
}

export interface Wheel {
  x: Mm
  r: Mm
}

export function sideWheels(car: ResolvedCar): Wheel[] {
  const r = wheelRadius(car)
  return [
    { x: car.frontOverhang, r },
    { x: car.frontOverhang + car.wheelbase, r },
  ]
}

/** Top view: x across the car (0 = centreline), y from the front bumper backward. */
export function topBody(car: ResolvedCar): Pt[] {
  const w = car.widthBody / 2
  const L = car.length
  const pts: Pt[] = [
    [-0.8 * w, 0], [0.8 * w, 0], [w, 0.07 * L], [w, 0.93 * L], [0.88 * w, L], [-0.88 * w, L], [-w, 0.93 * L], [-w, 0.07 * L],
  ]
  return fitTo(smooth(pts, 2), -w, w, 0, L)
}

/** The glass-and-roof area seen from above. */
export function topGlass(car: ResolvedCar): Pt[] {
  const w = car.widthBody / 2
  const [u0, u1] = glassSpan(car.bodyType)
  const y0 = u0 * car.length
  const y1 = Math.min(u1, 0.96) * car.length
  const pts: Pt[] = [[-0.6 * w, y0], [0.6 * w, y0], [0.78 * w, y0 + 0.12 * (y1 - y0)], [0.78 * w, y1], [-0.78 * w, y1], [-0.78 * w, y0 + 0.12 * (y1 - y0)]]
  return smooth(pts, 2)
}

export interface Rect {
  x: Mm
  y: Mm
  w: Mm
  h: Mm
}

/** Both mirrors as rectangles, top view. */
export function topMirrors(car: ResolvedCar): Rect[] {
  const y = mirrorY(car)
  const inner = car.widthBody / 2 - 40
  const outer = car.widthMirrors / 2
  return [
    { x: -outer, y, w: outer - inner, h: MIRROR_DEPTH },
    { x: inner, y, w: outer - inner, h: MIRROR_DEPTH },
  ]
}

const TIRE_WIDTH: Mm = 240

export function topTires(car: ResolvedCar): Rect[] {
  const r = wheelRadius(car)
  const outer = car.widthBody / 2 - 25
  return sideWheels(car).flatMap(({ x: y }) => [
    { x: -outer, y: y - r, w: TIRE_WIDTH, h: 2 * r },
    { x: outer - TIRE_WIDTH, y: y - r, w: TIRE_WIDTH, h: 2 * r },
  ])
}

/** Front view: x across (0 = centreline), y up from the ground. */
export function frontBody(car: ResolvedCar): Pt[] {
  const w = car.widthBody / 2
  const h = car.height
  const g = car.groundClearance
  const belt = beltHeight(car)
  const pts: Pt[] = [
    [-0.9 * w, g], [0.9 * w, g], [w, g + 0.1 * (belt - g)], [w, belt], [0.84 * w, belt + 0.1 * (h - belt)],
    [0.7 * w, h], [-0.7 * w, h], [-0.84 * w, belt + 0.1 * (h - belt)], [-w, belt],
    [-w, g + 0.1 * (belt - g)],
  ]
  return fitTo(smooth(pts, 2), -w, w, g, h)
}

export function frontMirrors(car: ResolvedCar): Rect[] {
  const y = beltHeight(car) - 40
  const inner = car.widthBody / 2 - 60
  const outer = car.widthMirrors / 2
  return [
    { x: -outer, y, w: outer - inner, h: 150 },
    { x: inner, y, w: outer - inner, h: 150 },
  ]
}

export function frontTires(car: ResolvedCar): Rect[] {
  const outer = car.widthBody / 2 - 25
  const tireH = car.groundClearance + 180
  return [
    { x: -outer, y: 0, w: TIRE_WIDTH, h: tireH },
    { x: outer - TIRE_WIDTH, y: 0, w: TIRE_WIDTH, h: tireH },
  ]
}
