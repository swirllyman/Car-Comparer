import type { ChargePort, Garage, Mm, ResolvedCar } from '../data/types'
import type { Parking } from './fit'
import { wheelRadius } from './shapes'
import { inches } from './units'

/** A charge port in top-view car coordinates: x across (driver's side negative), y back from the front bumper. */
export interface PortPoint {
  x: Mm
  y: Mm
  port: ChargePort
}

/**
 * Approximate port positions from the spec: side ports sit just behind the
 * front wheel or just behind the rear wheel (Tesla's tail-light ports are a
 * little further back, but within a foot of this).
 */
export function portPoints(car: ResolvedCar): PortPoint[] {
  const r = wheelRadius(car)
  return (car.chargePorts ?? []).map((port) => {
    if (port.side === 'center') return { x: 0, y: port.end === 'front' ? 0 : car.length, port }
    const x = ((port.side === 'left' ? -1 : 1) * car.widthBody) / 2
    const y =
      port.end === 'front'
        ? car.frontOverhang + r + 150
        : Math.min(car.length - 150, car.frontOverhang + car.wheelbase + r + 150)
    return { x, y, port }
  })
}

export function portLabel(p: ChargePort): string {
  if (p.side === 'center') return p.end === 'front' ? 'front, in the nose' : 'rear, centre'
  return `${p.side === 'left' ? 'driver' : 'passenger'} side ${p.end}`
}

type Pt = [number, number]

export function chargerPoint(g: Garage): Pt | null {
  const c = g.charger
  if (!c) return null
  if (c.wall === 'left') return [0, c.along]
  if (c.wall === 'right') return [g.width, c.along]
  return [c.along, 0]
}

interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** Does the segment a→b pass through the rectangle's interior? (Liang–Barsky clipping.) */
function crosses(a: Pt, b: Pt, r: Rect): boolean {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  let t0 = 0
  let t1 = 1
  const edges: [number, number][] = [
    [-dx, a[0] - r.x0],
    [dx, r.x1 - a[0]],
    [-dy, a[1] - r.y0],
    [dy, r.y1 - a[1]],
  ]
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q <= 0) return false
      continue
    }
    const t = q / p
    if (p < 0) t0 = Math.max(t0, t)
    else t1 = Math.min(t1, t)
    if (t0 >= t1) return false
  }
  return t1 - t0 > 1e-9
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

/**
 * Shortest floor route from `from` to `to` that goes around the rectangle
 * (the car's footprint) rather than under it: a visibility graph over the
 * rectangle's corners, which is exact for a single convex obstacle.
 */
export function routeAround(from: Pt, to: Pt, body: Rect, margin: Mm = 60): { length: Mm; path: Pt[] } | null {
  const solid: Rect = { x0: body.x0 - margin + 1, y0: body.y0 - margin + 1, x1: body.x1 + margin - 1, y1: body.y1 + margin - 1 }
  const nodes: Pt[] = [
    from,
    to,
    [body.x0 - margin, body.y0 - margin],
    [body.x1 + margin, body.y0 - margin],
    [body.x1 + margin, body.y1 + margin],
    [body.x0 - margin, body.y1 + margin],
  ]
  const n = nodes.length
  const best = Array<number>(n).fill(Infinity)
  const prev = Array<number>(n).fill(-1)
  const done = Array<boolean>(n).fill(false)
  best[0] = 0
  for (let k = 0; k < n; k++) {
    let u = -1
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || best[i] < best[u])) u = i
    if (u < 0 || best[u] === Infinity) break
    done[u] = true
    for (let v = 0; v < n; v++) {
      if (done[v] || crosses(nodes[u], nodes[v], solid)) continue
      const d = best[u] + dist(nodes[u], nodes[v])
      if (d < best[v]) {
        best[v] = d
        prev[v] = u
      }
    }
  }
  if (best[1] === Infinity) return null
  const path: Pt[] = []
  for (let i = 1; i >= 0; i = prev[i]) path.unshift(nodes[i])
  return { length: best[1], path }
}

/** Charger height to port height, plus a little slack so the cable isn't taut. */
export const CABLE_ALLOWANCE: Mm = inches(24)

export interface CableCheck {
  /** Floor route plus the allowance. */
  needed: Mm
  cable: Mm
  path: Pt[]
  port: PortPoint
}

/** Cable needed from the wall charger to the nearest port, with the car parked as given. */
export function checkCable(g: Garage, car: ResolvedCar, park: Parking): CableCheck | null {
  const charger = chargerPoint(g)
  const ports = portPoints(car)
  if (!charger || !g.charger || ports.length === 0) return null
  const body: Rect = {
    x0: park.centerX - car.widthBody / 2,
    x1: park.centerX + car.widthBody / 2,
    y0: park.frontY,
    y1: park.frontY + car.length,
  }
  let result: CableCheck | null = null
  for (const p of ports) {
    // Step the port just outside the body so the route can reach it.
    const out = 60
    const px = park.centerX + p.x + (p.port.side === 'left' ? -out : p.port.side === 'right' ? out : 0)
    const py = park.frontY + p.y + (p.port.side === 'center' ? (p.port.end === 'front' ? -out : out) : 0)
    const route = routeAround(charger, [px, py], body)
    if (!route) continue
    const needed = route.length + CABLE_ALLOWANCE
    if (!result || needed < result.needed) result = { needed, cable: g.charger.cable, path: route.path, port: p }
  }
  return result
}
