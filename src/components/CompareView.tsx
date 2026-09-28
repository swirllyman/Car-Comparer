import type { ResolvedCar, Units } from '../data/types'
import type { Comparison } from '../geometry/compare'
import { MIRROR_DEPTH, beltHeight, mirrorY } from '../geometry/shapes'
import { formatDelta } from '../geometry/units'
import { Callout, CarFront, CarSide, CarTop, DimLine, type Tone } from './draw'
import { fontFor, type Box } from './useSize'

interface Props {
  current: ResolvedCar
  candidate: ResolvedCar
  cmp: Comparison
  view: 'top' | 'side' | 'front'
  units: Units
  /** The space available on screen, so labels render at a readable size. */
  box: Box
}

/**
 * The overlay: current car solid, candidate as a translucent shell on top,
 * drawn in millimetres with an orthographic (flat) projection so every
 * proportion on screen is true. Labels are short (the strip below the
 * drawing spells things out) so the cars get the room.
 */
export function CompareView(props: Props) {
  if (props.view === 'side') return <SideView {...props} />
  if (props.view === 'front') return <FrontView {...props} />
  return <TopView {...props} />
}

const d = (mm: number, units: Units) => formatDelta(mm, units)
const toneOf = (mm: number): Tone => (Math.abs(mm) < 0.5 ? 'neutral' : mm > 0 ? 'bigger' : 'smaller')

/** Label room either side, in font sizes: a leader plus about seven characters. */
const SIDE_ROOM = 6.5

function TopView({ current, candidate, cmp, units, box }: Props) {
  const cf = cmp.candidate.frontY
  const half = Math.max(current.widthMirrors, candidate.widthMirrors) / 2
  const y0 = Math.min(0, cf)
  const y1 = Math.max(current.length, cf + candidate.length)
  const fs = fontFor(2 * half, 2 * SIDE_ROOM, y1 - y0, 3, box)
  const xDim = half + fs * 0.8
  const yMid = (Math.max(0, cf) + Math.min(current.length, cf + candidate.length)) / 2
  const myC = cf + mirrorY(candidate) + MIRROR_DEPTH / 2
  const pad = fs * SIDE_ROOM
  return (
    <svg className="drawing" viewBox={`${-half - pad} ${y0 - fs * 1.5} ${2 * half + 2 * pad} ${y1 - y0 + fs * 3}`}>
      <CarTop car={current} x={0} y={0} variant="current" />
      <CarTop car={candidate} x={0} y={cf} variant="candidate" />
      {/* Vertical lines drawn bottom-to-top so their labels land on the right. */}
      <DimLine
        a={[xDim, Math.max(0, cf)]}
        b={[xDim, Math.min(0, cf)]}
        sub="front"
        label={d(cmp.front, units)}
        fs={fs}
        tone={toneOf(cmp.front)}
        anchor="start"
        labelAt={0.5}
      />
      <DimLine
        a={[xDim, Math.max(current.length, cf + candidate.length)]}
        b={[xDim, Math.min(current.length, cf + candidate.length)]}
        sub="rear"
        label={d(cmp.rear, units)}
        fs={fs}
        tone={toneOf(cmp.rear)}
        anchor="start"
        labelAt={0.5}
      />
      <Callout to={[candidate.widthBody / 2, yMid]} at={[xDim, yMid]} sub="each side" label={d(cmp.side, units)} fs={fs} tone={toneOf(cmp.side)} />
      <Callout
        to={[-candidate.widthMirrors / 2, myC]}
        at={[-xDim, myC]}
        sub="mirror"
        label={d(cmp.sideMirrors, units)}
        fs={fs}
        tone={toneOf(cmp.sideMirrors)}
        anchor="end"
      />
      <text x={0} y={y0 - fs * 0.6} fontSize={fs * 0.75} textAnchor="middle" className="drawing__note">
        ▲ front
      </text>
    </svg>
  )
}

function SideView({ current, candidate, cmp, units, box }: Props) {
  const cf = cmp.candidate.frontY
  const x0 = Math.min(0, cf)
  const x1 = Math.max(current.length, cf + candidate.length)
  const hMax = Math.max(current.height, candidate.height)
  const fs = fontFor(x1 - x0, SIDE_ROOM + 1.5, hMax, 5.5, box)
  const yDim = fs * 1.1
  const xTop = x0 - fs * 0.8
  return (
    <svg className="drawing" viewBox={`${x0 - fs * SIDE_ROOM} ${-hMax - fs * 2.5} ${x1 - x0 + fs * (SIDE_ROOM + 1.5)} ${hMax + fs * 5.5}`}>
      <line x1={x0 - fs * SIDE_ROOM} y1={0} x2={x1 + fs * 1.5} y2={0} className="ground" />
      <CarSide car={current} x={0} y={0} variant="current" />
      <CarSide car={candidate} x={cf} y={0} variant="candidate" />
      <DimLine a={[Math.min(0, cf), yDim]} b={[Math.max(0, cf), yDim]} label={d(cmp.front, units)} sub="front" fs={fs} tone={toneOf(cmp.front)} labelAt={1.9} />
      <DimLine
        a={[Math.min(current.length, cf + candidate.length), yDim]}
        b={[Math.max(current.length, cf + candidate.length), yDim]}
        label={d(cmp.rear, units)}
        sub="rear"
        fs={fs}
        tone={toneOf(cmp.rear)}
        labelAt={1.9}
      />
      <DimLine
        a={[xTop, -Math.max(current.height, candidate.height)]}
        b={[xTop, -Math.min(current.height, candidate.height)]}
        label={d(cmp.top, units)}
        sub="roof"
        fs={fs}
        tone={toneOf(cmp.top)}
        anchor="end"
        labelAt={0.5}
      />
      <text x={x0} y={-hMax - fs * 1.6} fontSize={fs * 0.75} className="drawing__note">
        ◀ front
      </text>
    </svg>
  )
}

function FrontView({ current, candidate, cmp, units, box }: Props) {
  const half = Math.max(current.widthMirrors, candidate.widthMirrors) / 2
  const hMax = Math.max(current.height, candidate.height)
  const fs = fontFor(2 * half, 2 * SIDE_ROOM, hMax, 3, box)
  const xDim = half + fs * 0.8
  const beltC = (candidate.groundClearance + beltHeight(candidate)) / 2
  const mirrorC = beltHeight(candidate) + 35
  const pad = fs * SIDE_ROOM
  return (
    <svg className="drawing" viewBox={`${-half - pad} ${-hMax - fs * 2} ${2 * half + 2 * pad} ${hMax + fs * 3}`}>
      <line x1={-half - pad} y1={0} x2={half + pad} y2={0} className="ground" />
      <CarFront car={current} x={0} y={0} variant="current" />
      <CarFront car={candidate} x={0} y={0} variant="candidate" />
      <DimLine
        a={[xDim, -Math.min(current.height, candidate.height)]}
        b={[xDim, -Math.max(current.height, candidate.height)]}
        label={d(cmp.top, units)}
        sub="roof"
        fs={fs}
        tone={toneOf(cmp.top)}
        anchor="start"
        labelAt={0.5}
      />
      <Callout to={[candidate.widthBody / 2, -beltC]} at={[xDim, -beltC]} sub="each side" label={d(cmp.side, units)} fs={fs} tone={toneOf(cmp.side)} />
      <Callout
        to={[-candidate.widthMirrors / 2, -mirrorC]}
        at={[-xDim, -mirrorC]}
        sub="mirror"
        label={d(cmp.sideMirrors, units)}
        fs={fs}
        tone={toneOf(cmp.sideMirrors)}
        anchor="end"
      />
    </svg>
  )
}
