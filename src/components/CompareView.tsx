import type { ResolvedCar, Units } from '../data/types'
import type { Comparison } from '../geometry/compare'
import { MIRROR_DEPTH, beltHeight, mirrorY } from '../geometry/shapes'
import { formatDelta } from '../geometry/units'
import { Callout, CarFront, CarSide, CarTop, DimLine, type Tone } from './draw'

interface Props {
  current: ResolvedCar
  candidate: ResolvedCar
  cmp: Comparison
  view: 'top' | 'side' | 'front'
  units: Units
}

/**
 * The overlay: current car solid, candidate as a translucent shell on top,
 * drawn in millimetres with an orthographic (flat) projection so every
 * proportion on screen is true.
 */
export function CompareView(props: Props) {
  if (props.view === 'side') return <SideView {...props} />
  if (props.view === 'front') return <FrontView {...props} />
  return <TopView {...props} />
}

const d = (mm: number, units: Units) => formatDelta(mm, units)
const toneOf = (mm: number): Tone => (Math.abs(mm) < 0.5 ? 'neutral' : mm > 0 ? 'bigger' : 'smaller')

function TopView({ current, candidate, cmp, units }: Props) {
  const cf = cmp.candidate.frontY
  const half = Math.max(current.widthMirrors, candidate.widthMirrors) / 2
  const y0 = Math.min(0, cf)
  const y1 = Math.max(current.length, cf + candidate.length)
  const fs = (y1 - y0) * 0.03
  const xDim = half + fs * 1.2
  const yMid = (Math.max(0, cf) + Math.min(current.length, cf + candidate.length)) / 2
  const myC = cf + mirrorY(candidate) + MIRROR_DEPTH / 2
  const pad = fs * 14
  return (
    <svg className="drawing" viewBox={`${-half - pad} ${y0 - fs * 2} ${2 * half + 2 * pad} ${y1 - y0 + fs * 4}`}>
      <CarTop car={current} x={0} y={0} variant="current" />
      <CarTop car={candidate} x={0} y={cf} variant="candidate" />
      {/* Vertical lines drawn bottom-to-top so their labels land on the right. */}
      <DimLine a={[xDim, Math.max(0, cf)]} b={[xDim, Math.min(0, cf)]} label={`Front ${d(cmp.front, units)}`} fs={fs} tone={toneOf(cmp.front)} anchor="start" labelAt={0.6} />
      <DimLine
        a={[xDim, Math.max(current.length, cf + candidate.length)]}
        b={[xDim, Math.min(current.length, cf + candidate.length)]}
        label={`Rear ${d(cmp.rear, units)}`}
        fs={fs}
        tone={toneOf(cmp.rear)}
        anchor="start"
        labelAt={0.6}
      />
      <Callout to={[candidate.widthBody / 2, yMid]} at={[xDim, yMid]} label={`Body ${d(cmp.side, units)} / side`} fs={fs} tone={toneOf(cmp.side)} />
      <Callout
        to={[-candidate.widthMirrors / 2, myC]}
        at={[-xDim, myC]}
        label={`Mirrors ${d(cmp.sideMirrors, units)} / side`}
        fs={fs}
        tone={toneOf(cmp.sideMirrors)}
        anchor="end"
      />
      <text x={0} y={y0 - fs * 0.8} fontSize={fs * 0.8} textAnchor="middle" className="drawing__note">
        ▲ front
      </text>
    </svg>
  )
}

function SideView({ current, candidate, cmp, units }: Props) {
  const cf = cmp.candidate.frontY
  const x0 = Math.min(0, cf)
  const x1 = Math.max(current.length, cf + candidate.length)
  const hMax = Math.max(current.height, candidate.height)
  const fs = (x1 - x0) * 0.028
  const yDim = fs * 1.2
  const xTop = x0 - fs * 1.2
  return (
    <svg className="drawing" viewBox={`${x0 - fs * 12} ${-hMax - fs * 2} ${x1 - x0 + fs * 21} ${hMax + fs * 5}`}>
      <line x1={x0 - fs * 11} y1={0} x2={x1 + fs * 8} y2={0} className="ground" />
      <CarSide car={current} x={0} y={0} variant="current" />
      <CarSide car={candidate} x={cf} y={0} variant="candidate" />
      <DimLine a={[Math.min(0, cf), yDim]} b={[Math.max(0, cf), yDim]} label={`Front ${d(cmp.front, units)}`} fs={fs} tone={toneOf(cmp.front)} />
      <DimLine
        a={[Math.min(current.length, cf + candidate.length), yDim]}
        b={[Math.max(current.length, cf + candidate.length), yDim]}
        label={`Rear ${d(cmp.rear, units)}`}
        fs={fs}
        tone={toneOf(cmp.rear)}
      />
      <DimLine
        a={[xTop, -Math.max(current.height, candidate.height)]}
        b={[xTop, -Math.min(current.height, candidate.height)]}
        label={`Roof ${d(cmp.top, units)}`}
        fs={fs}
        tone={toneOf(cmp.top)}
        anchor="end"
        labelAt={0.6}
      />
      <text x={x0} y={-hMax - fs * 0.8} fontSize={fs * 0.8} className="drawing__note">
        ◀ front
      </text>
    </svg>
  )
}

function FrontView({ current, candidate, cmp, units }: Props) {
  const half = Math.max(current.widthMirrors, candidate.widthMirrors) / 2
  const hMax = Math.max(current.height, candidate.height)
  const fs = Math.max(2 * half, hMax) * 0.032
  const xDim = half + fs * 1.2
  const beltC = (candidate.groundClearance + beltHeight(candidate)) / 2
  const mirrorC = beltHeight(candidate) + 35
  const pad = fs * 14
  return (
    <svg className="drawing" viewBox={`${-half - pad} ${-hMax - fs * 2} ${2 * half + 2 * pad} ${hMax + fs * 3}`}>
      <line x1={-half - pad} y1={0} x2={half + pad} y2={0} className="ground" />
      <CarFront car={current} x={0} y={0} variant="current" />
      <CarFront car={candidate} x={0} y={0} variant="candidate" />
      <DimLine
        a={[xDim, -Math.min(current.height, candidate.height)]}
        b={[xDim, -Math.max(current.height, candidate.height)]}
        label={`Roof ${d(cmp.top, units)}`}
        fs={fs}
        tone={toneOf(cmp.top)}
        anchor="start"
        labelAt={0.6}
      />
      <Callout to={[candidate.widthBody / 2, -beltC]} at={[xDim, -beltC]} label={`Body ${d(cmp.side, units)} / side`} fs={fs} tone={toneOf(cmp.side)} />
      <Callout
        to={[-candidate.widthMirrors / 2, -mirrorC]}
        at={[-xDim, -mirrorC]}
        label={`Mirrors ${d(cmp.sideMirrors, units)} / side`}
        fs={fs}
        tone={toneOf(cmp.sideMirrors)}
        anchor="end"
      />
    </svg>
  )
}
