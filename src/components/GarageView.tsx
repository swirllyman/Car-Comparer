import { useRef, type PointerEvent } from 'react'
import type { Garage, ResolvedCar, Units } from '../data/types'
import { checkFit, clearanceLevel, DOOR_COMFORT, type Clearance, type Fit, type Parking } from '../geometry/fit'
import { MIRROR_DEPTH, mirrorY } from '../geometry/shapes'
import { formatDelta, formatLength } from '../geometry/units'
import { CarTop, DimLine } from './draw'

interface Props {
  garage: Garage
  current: ResolvedCar
  candidate: ResolvedCar
  currentPark: Parking
  candidatePark: Parking
  onMove: (p: Parking) => void
  showCurrent: boolean
  units: Units
}

const WALL = 150

/** Top-down garage, back wall at the top, door at the bottom; drag the candidate to re-park it. */
export function GarageView({ garage, current, candidate, currentPark, candidatePark, onMove, showCurrent, units }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const fit = checkFit(garage, candidate, candidatePark)
  const fs = Math.max(garage.width, garage.depth) * 0.028

  const toMm = (e: PointerEvent) => {
    const m = svg.current!.getScreenCTM()!.inverse()
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m)
    return [p.x, p.y] as const
  }
  const down = (e: PointerEvent<SVGGElement>) => {
    const [x, y] = toMm(e)
    drag.current = { dx: x - candidatePark.centerX, dy: y - candidatePark.frontY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent<SVGGElement>) => {
    if (!drag.current) return
    const [x, y] = toMm(e)
    // Snap to whole millimetres; the readouts are the precise part.
    onMove({ centerX: Math.round(x - drag.current.dx), frontY: Math.round(y - drag.current.dy) })
  }
  const up = () => (drag.current = null)

  const body = {
    x0: candidatePark.centerX - candidate.widthBody / 2,
    x1: candidatePark.centerX + candidate.widthBody / 2,
    y0: candidatePark.frontY,
    y1: candidatePark.frontY + candidate.length,
  }
  const midY = (body.y0 + body.y1) / 2
  // Draw each side gap from whichever part is closest: the mirror or the body.
  const mY = candidatePark.frontY + mirrorY(candidate) + MIRROR_DEPTH / 2
  const atMirror = (c: Clearance) => c.against.endsWith('(at mirror)')
  const lx = atMirror(fit.left) ? candidatePark.centerX - candidate.widthMirrors / 2 : body.x0
  const rx = atMirror(fit.right) ? candidatePark.centerX + candidate.widthMirrors / 2 : body.x1
  const ly = atMirror(fit.left) ? mY : midY
  const ry = atMirror(fit.right) ? mY : midY
  const f = (c: Clearance) => formatLength(c.value, units)
  const pad = fs * 2

  return (
    <svg
      ref={svg}
      className="drawing drawing--garage"
      viewBox={`${-WALL - pad} ${-WALL - pad} ${garage.width + 2 * (WALL + pad)} ${garage.depth + 2 * WALL + pad * 2.5}`}
    >
      <rect x={0} y={0} width={garage.width} height={garage.depth} className="garage__floor" />
      {/* Walls, with the door opening cut out of the bottom one. */}
      <path
        className="garage__wall"
        d={`M${-WALL},${garage.depth} V${-WALL} H${garage.width + WALL} V${garage.depth} H${garage.width} V0 H0 V${garage.depth}Z
            M${-WALL},${garage.depth} H${garage.doorOffset} V${garage.depth + WALL} H${-WALL}Z
            M${garage.doorOffset + garage.doorWidth},${garage.depth} H${garage.width + WALL} V${garage.depth + WALL} H${garage.doorOffset + garage.doorWidth}Z`}
      />
      <line x1={garage.doorOffset} y1={garage.depth + WALL / 2} x2={garage.doorOffset + garage.doorWidth} y2={garage.depth + WALL / 2} className="garage__door" />
      <text x={garage.doorOffset + garage.doorWidth / 2} y={garage.depth + WALL + fs * 1.1} fontSize={fs * 0.8} textAnchor="middle" className="drawing__note">
        garage door
      </text>
      {garage.obstacles.map((o) => (
        <g key={o.id} className="garage__obstacle">
          <rect x={o.x} y={o.y} width={o.w} height={o.d} />
          <text x={o.x + o.w / 2} y={o.y + o.d / 2} fontSize={fs * 0.7} textAnchor="middle" dominantBaseline="middle">
            {o.label}
          </text>
        </g>
      ))}
      {showCurrent && <CarTop car={current} x={currentPark.centerX} y={currentPark.frontY} variant="current" />}
      <g onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="draggable">
        <CarTop car={candidate} x={candidatePark.centerX} y={candidatePark.frontY} variant="candidate" />
      </g>
      <DimLine a={[lx - fit.left.value, ly]} b={[lx, ly]} label={f(fit.left)} fs={fs} tone={tone(fit.left.value)} labelAt={-0.9} />
      <DimLine a={[rx, ry]} b={[rx + fit.right.value, ry]} label={f(fit.right)} fs={fs} tone={tone(fit.right.value)} labelAt={-0.9} />
      <DimLine a={[candidatePark.centerX, body.y0]} b={[candidatePark.centerX, body.y0 - fit.front.value]} label={f(fit.front)} fs={fs} tone={tone(fit.front.value)} anchor="start" labelAt={0.6} />
      <DimLine a={[candidatePark.centerX, garage.depth]} b={[candidatePark.centerX, body.y1]} label={f(fit.rear)} fs={fs} tone={tone(fit.rear.value)} anchor="start" labelAt={0.6} />
    </svg>
  )
}

const tone = (mm: number) => {
  const l = clearanceLevel(mm)
  return l === 'bad' ? 'bigger' : l === 'tight' ? 'tight' : 'smaller'
}

/** The readout beside the garage drawing. */
export function FitPanel({ fit, currentFit, units }: { fit: Fit; currentFit: Fit; units: Units }) {
  const L = (mm: number) => formatLength(mm, units)
  const vs = (a: number, b: number) => {
    const diff = a - b
    return Math.abs(diff) < 0.5 ? 'same as now' : `${formatDelta(diff, units)} vs now`
  }
  const rows: { label: string; value: number; now: number; note?: string; comfort?: number }[] = [
    { label: 'Left side', value: fit.left.value, now: currentFit.left.value, note: fit.left.against },
    { label: 'Right side', value: fit.right.value, now: currentFit.right.value, note: fit.right.against },
    { label: 'In front', value: fit.front.value, now: currentFit.front.value, note: fit.front.against },
    { label: 'Behind', value: fit.rear.value, now: currentFit.rear.value, note: 'to the closed garage door' },
    { label: 'Driver door room', value: fit.driverDoor.value, now: currentFit.driverDoor.value, note: fit.driverDoor.against, comfort: DOOR_COMFORT },
    { label: 'Passenger door room', value: fit.passengerDoor.value, now: currentFit.passengerDoor.value, note: fit.passengerDoor.against, comfort: DOOR_COMFORT },
  ]
  return (
    <div className="fit">
      <p className={`verdict verdict--${fit.fits ? 'ok' : 'bad'}`}>
        {fit.fits ? 'Fits, and the door closes.' : 'Doesn’t fit where it’s parked.'}
      </p>
      {!fit.fits && fit.spareLength >= 0 && fit.spareWidth >= 0 && (
        <p className="hint">The garage is big enough overall — try dragging the car to a better spot.</p>
      )}
      {(fit.spareLength < 0 || fit.spareWidth < 0) && (
        <p className="hint">
          Too big for this garage at any position ({fit.spareLength < 0 ? `${L(-fit.spareLength)} too long` : ''}
          {fit.spareLength < 0 && fit.spareWidth < 0 ? ', ' : ''}
          {fit.spareWidth < 0 ? `${L(-fit.spareWidth)} too wide with mirrors out` : ''}).
        </p>
      )}
      <table className="table">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th>{r.label}</th>
              <td>
                <span className={`lvl lvl--${clearanceLevel(r.value, r.comfort)}`}>{L(r.value)}</span>
                <span className="note">
                  {vs(r.value, r.now)}
                  {r.note ? ` · ${r.note}` : ''}
                </span>
              </td>
            </tr>
          ))}
          <tr>
            <th>Doorway, driving in</th>
            <td>
              <span className={`lvl lvl--${clearanceLevel(Math.min(fit.doorwayLeft, fit.doorwayRight))}`}>
                {L(fit.doorwayLeft)} · {L(fit.doorwayRight)}
              </span>
              <span className="note">left · right, mirrors out</span>
            </td>
          </tr>
          <tr>
            <th>Door height</th>
            <td>
              <span className={`lvl lvl--${clearanceLevel(fit.doorwayTop)}`}>{L(fit.doorwayTop)}</span>
              <span className="note">above the roof</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
