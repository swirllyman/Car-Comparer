import type { ResolvedCar } from '../data/types'
import { portLabel, portPoints } from '../geometry/charge'
import {
  frontBody,
  frontMirrors,
  frontTires,
  sideGlass,
  sideProfile,
  sideWheels,
  toPath,
  topBody,
  topGlass,
  topMirrors,
  topTires,
  type Pt,
  type Rect,
} from '../geometry/shapes'

export type Variant = 'current' | 'candidate'
export type Tone = 'neutral' | 'bigger' | 'smaller' | 'tight'

const flip = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [x, -y])
const flipRect = (r: Rect): Rect => ({ ...r, y: -(r.y + r.h) })

const Rects = ({ rects, className }: { rects: Rect[]; className: string }) => (
  <>
    {rects.map((r, i) => (
      <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={Math.min(r.w, r.h) * 0.3} className={className} />
    ))}
  </>
)

/** Top view, nose up, front bumper at (x, y) with x the centreline. */
export function CarTop({ car, x, y, variant }: { car: ResolvedCar; x: number; y: number; variant: Variant }) {
  return (
    <g transform={`translate(${x} ${y})`} className={`car car--${variant}`}>
      <Rects rects={topTires(car)} className="car__tire" />
      <Rects rects={topMirrors(car)} className="car__body" />
      <path d={toPath(topBody(car))} className="car__body" />
      <path d={toPath(topGlass(car))} className="car__glass" />
      {portPoints(car).map((p, i) => (
        <g key={i} className="car__port">
          <title>Charge port: {portLabel(p.port)}</title>
          <circle cx={p.x} cy={p.y} r={110} />
          <text x={p.x} y={p.y} fontSize={150} textAnchor="middle" dominantBaseline="central">
            ⚡
          </text>
        </g>
      ))}
    </g>
  )
}

/** Side view, facing left, front bumper at x and ground at y. */
export function CarSide({ car, x, y, variant }: { car: ResolvedCar; x: number; y: number; variant: Variant }) {
  return (
    <g transform={`translate(${x} ${y})`} className={`car car--${variant}`}>
      <path d={toPath(flip(sideProfile(car)))} className="car__body" />
      <path d={toPath(flip(sideGlass(car)))} className="car__glass" />
      {sideWheels(car).map((w, i) => (
        <g key={i}>
          <circle cx={w.x} cy={-w.r} r={w.r} className="car__tire" />
          <circle cx={w.x} cy={-w.r} r={w.r * 0.55} className="car__hub" />
        </g>
      ))}
    </g>
  )
}

/** Front view, centreline at x and ground at y. */
export function CarFront({ car, x, y, variant }: { car: ResolvedCar; x: number; y: number; variant: Variant }) {
  return (
    <g transform={`translate(${x} ${y})`} className={`car car--${variant}`}>
      <Rects rects={frontTires(car).map(flipRect)} className="car__tire" />
      <path d={toPath(flip(frontBody(car)))} className="car__body" />
      <Rects rects={frontMirrors(car).map(flipRect)} className="car__body" />
    </g>
  )
}

/**
 * A dimension line from a to b with end ticks and a label. The label sits
 * `labelAt` along the perpendicular (in font-size units), so short spans
 * — a couple of inches on a five-metre car — stay readable.
 */
export function DimLine({
  a,
  b,
  label,
  sub,
  fs,
  tone = 'neutral',
  labelAt = 1.2,
  anchor = 'middle',
}: {
  a: Pt
  b: Pt
  label: string
  /** A small word above the value, e.g. "front". */
  sub?: string
  fs: number
  tone?: Tone
  labelAt?: number
  anchor?: 'start' | 'middle' | 'end'
}) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  const len = Math.hypot(dx, dy) || 1
  const [nx, ny] = [-dy / len, dx / len]
  const t = fs * 0.35
  const mx = (a[0] + b[0]) / 2 + nx * fs * labelAt
  const my = (a[1] + b[1]) / 2 + ny * fs * labelAt
  return (
    <g className={`dim dim--${tone}`}>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
      <line x1={a[0] - nx * t} y1={a[1] - ny * t} x2={a[0] + nx * t} y2={a[1] + ny * t} />
      <line x1={b[0] - nx * t} y1={b[1] - ny * t} x2={b[0] + nx * t} y2={b[1] + ny * t} />
      <Label x={mx} y={my} fs={fs} anchor={anchor} label={label} sub={sub} />
    </g>
  )
}

/** A value with an optional small caption stacked above it. */
function Label({ x, y, fs, anchor, label, sub }: { x: number; y: number; fs: number; anchor: 'start' | 'middle' | 'end'; label: string; sub?: string }) {
  return (
    <>
      {sub && (
        <text x={x} y={y - fs * 0.95} fontSize={fs * 0.72} textAnchor={anchor} dominantBaseline="middle" className="dim__sub">
          {sub}
        </text>
      )}
      <text x={x} y={y} fontSize={fs} textAnchor={anchor} dominantBaseline="middle">
        {label}
      </text>
    </>
  )
}

/** A label with a short leader line to the point it describes. */
export function Callout({ at, to, label, sub, fs, tone = 'neutral', anchor = 'start' }: {
  at: Pt
  to: Pt
  label: string
  sub?: string
  fs: number
  tone?: Tone
  anchor?: 'start' | 'middle' | 'end'
}) {
  return (
    <g className={`dim dim--${tone}`}>
      <line x1={to[0]} y1={to[1]} x2={at[0]} y2={at[1]} className="dim__leader" />
      <circle cx={to[0]} cy={to[1]} r={fs * 0.15} />
      <Label x={at[0] + (anchor === 'start' ? fs * 0.3 : anchor === 'end' ? -fs * 0.3 : 0)} y={at[1]} fs={fs} anchor={anchor} label={label} sub={sub} />
    </g>
  )
}
