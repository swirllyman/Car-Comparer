import { lazy, Suspense, useState } from 'react'
import { CompareView } from './components/CompareView'
import { CarEditor, GarageSetup } from './components/forms'
import { FitPanel, GarageView } from './components/GarageView'
import { CARS } from './data/cars'
import { allCars, findCar, useAppState } from './data/store'
import type { Anchor, CarSpec, Garage, ResolvedCar, Units, View } from './data/types'
import { compareCars } from './geometry/compare'
import { checkFit, currentParking, type Parking } from './geometry/fit'
import { carFullName, resolveCar } from './geometry/resolve'
import { formatDelta, formatLength, inches } from './geometry/units'

const Scene3D = lazy(() => import('./scene/Scene3D'))

const VIEWS: { id: View; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'side', label: 'Side' },
  { id: 'front', label: 'Front' },
  { id: '3d', label: '3D' },
  { id: 'garage', label: 'Garage' },
  { id: 'stats', label: 'Stats' },
]

const ANCHORS: { id: Anchor; label: string }[] = [
  { id: 'rear', label: 'Rear bumpers' },
  { id: 'front', label: 'Front bumpers' },
  { id: 'center', label: 'Centres' },
]

type Editing = { kind: 'garage' } | { kind: 'car'; which: 'currentId' | 'candidateId'; car: CarSpec } | null

const NEW_CAR = (): CarSpec => ({
  id: `custom-${crypto.randomUUID()}`,
  year: new Date().getFullYear(),
  make: '',
  model: 'My car',
  trim: '',
  bodyType: 'suv',
  length: inches(185),
  widthBody: inches(74),
  height: inches(67),
  wheelbase: inches(110),
  source: 'Entered by you',
  custom: true,
})

export default function App() {
  const [state, update] = useAppState()
  const [editing, setEditing] = useState<Editing>(null)
  const [candidatePark, setCandidatePark] = useState<Parking | null>(null)
  const [showCurrentInGarage, setShowCurrentInGarage] = useState(true)
  const { units, view, anchor, garage } = state

  const cars = allCars(state.customCars)
  const current = resolveCar(findCar(state.customCars, state.currentId))
  const candidate = resolveCar(findCar(state.customCars, state.candidateId))
  const cmp = compareCars(current, candidate, anchor)

  const curPark = currentParking(garage, current)
  // By default the new car pulls up to the same stop, on the same line.
  const candPark = candidatePark ?? { centerX: curPark.centerX, frontY: curPark.frontY }

  const saveCar = (c: CarSpec, which: 'currentId' | 'candidateId') => {
    update({ customCars: [...state.customCars.filter((x) => x.id !== c.id), c], [which]: c.id })
    setEditing(null)
  }

  if (editing?.kind === 'garage') {
    return (
      <main className="app">
        <GarageSetup
          garage={garage}
          units={units}
          onCancel={() => setEditing(null)}
          onSave={(g) => {
            update({ garage: g, garageIsMine: true })
            setCandidatePark(null)
            setEditing(null)
          }}
        />
      </main>
    )
  }
  if (editing?.kind === 'car') {
    const builtIn = CARS.some((c) => c.id === editing.car.id)
    return (
      <main className="app">
        <CarEditor
          car={editing.car}
          units={units}
          isOverride={builtIn && state.customCars.some((c) => c.id === editing.car.id)}
          onCancel={() => setEditing(null)}
          onSave={(c) => saveCar(c, editing.which)}
          onReset={() => {
            update({ customCars: state.customCars.filter((c) => c.id !== editing.car.id) })
            setEditing(null)
          }}
        />
      </main>
    )
  }

  const picker = (which: 'currentId' | 'candidateId', label: string) => (
    <div className="picker">
      <span className="picker__label">{label}</span>
      <div className="picker__row">
        <select
          value={state[which]}
          onChange={(e) => {
            if (e.target.value === '__new') setEditing({ kind: 'car', which, car: NEW_CAR() })
            else {
              update({ [which]: e.target.value })
              setCandidatePark(null)
            }
          }}
        >
          {cars.map((c) => (
            <option key={c.id} value={c.id}>
              {carFullName(c)}
              {c.custom ? ' ✎' : ''}
            </option>
          ))}
          <option value="__new">+ Add a car…</option>
        </select>
        <button
          className="btn btn--quiet"
          title="Edit dimensions"
          onClick={() => setEditing({ kind: 'car', which, car: findCar(state.customCars, state[which]) })}
        >
          Edit
        </button>
      </div>
    </div>
  )

  return (
    <main className="app">
      <header className="top">
        <h1>Car Comparer</h1>
        <select value={units} onChange={(e) => update({ units: e.target.value as Units })} aria-label="Units">
          <option value="in">inches</option>
          <option value="ftin">feet + inches</option>
          <option value="cm">centimetres</option>
        </select>
      </header>

      <section className="pickers">
        {picker('currentId', 'My car')}
        <button
          className="btn btn--quiet swap"
          title="Swap"
          onClick={() => update({ currentId: state.candidateId, candidateId: state.currentId })}
        >
          ⇄
        </button>
        {picker('candidateId', 'Compare with')}
      </section>

      <nav className="tabs" role="tablist">
        {VIEWS.map((v) => (
          <button key={v.id} role="tab" aria-selected={view === v.id} className="tab" onClick={() => update({ view: v.id })}>
            {v.label}
          </button>
        ))}
      </nav>

      {(view === 'top' || view === 'side' || view === '3d') && (
        <div className="segmented" aria-label="Line up by">
          <span className="muted">Line up:</span>
          {ANCHORS.map((a) => (
            <button key={a.id} aria-pressed={anchor === a.id} onClick={() => update({ anchor: a.id })}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {view === 'garage' ? (
        <GarageTab
          {...{ current, candidate, units, curPark, candPark, showCurrentInGarage }}
          garage={garage}
          garageIsMine={state.garageIsMine}
          onMove={setCandidatePark}
          onReset={() => setCandidatePark(null)}
          onCenter={() => setCandidatePark({ centerX: garage.width / 2, frontY: candPark.frontY })}
          onToggleCurrent={setShowCurrentInGarage}
          onEditGarage={() => setEditing({ kind: 'garage' })}
        />
      ) : view === 'stats' ? (
        <StatsTable current={current} candidate={candidate} units={units} />
      ) : (
        <>
          <div className="stage">
            {view === '3d' ? (
              <Suspense fallback={<p className="muted center">Loading 3D…</p>}>
                <Scene3D current={current} candidate={candidate} candidateX={cmp.candidate.frontY} />
              </Suspense>
            ) : (
              <CompareView current={current} candidate={candidate} cmp={cmp} view={view} units={units} />
            )}
          </div>
          <Legend current={current} candidate={candidate} />
          <DimTable current={current} candidate={candidate} units={units} />
        </>
      )}

      <Notes cars={[current, candidate]} />
    </main>
  )
}

function Legend({ current, candidate }: { current: ResolvedCar; candidate: ResolvedCar }) {
  return (
    <p className="legend">
      <span className="swatch swatch--current" /> {carFullName(current)}
      <span className="swatch swatch--candidate" /> {carFullName(candidate)}
    </p>
  )
}

const DIMS: { key: keyof ResolvedCar; label: string }[] = [
  { key: 'length', label: 'Length' },
  { key: 'widthBody', label: 'Width (body)' },
  { key: 'widthMirrors', label: 'Width (mirrors out)' },
  { key: 'height', label: 'Height' },
  { key: 'wheelbase', label: 'Wheelbase' },
  { key: 'groundClearance', label: 'Ground clearance' },
]

function DimTable({ current, candidate, units }: { current: ResolvedCar; candidate: ResolvedCar; units: Units }) {
  const est = (c: ResolvedCar, k: keyof ResolvedCar) =>
    (c.estimated as string[]).includes(k) ? <abbr title="Estimated — edit the car to enter a real figure"> est.</abbr> : null
  return (
    <table className="table dims">
      <thead>
        <tr>
          <th />
          <th>Mine</th>
          <th>Other</th>
          <th>Difference</th>
        </tr>
      </thead>
      <tbody>
        {DIMS.map(({ key, label }) => {
          const a = current[key] as number
          const b = candidate[key] as number
          const diff = b - a
          return (
            <tr key={key}>
              <th>{label}</th>
              <td>
                {formatLength(a, units)}
                {est(current, key)}
              </td>
              <td>
                {formatLength(b, units)}
                {est(candidate, key)}
              </td>
              <td className={`delta delta--${Math.abs(diff) < 0.5 ? 'same' : diff > 0 ? 'bigger' : 'smaller'}`}>
                {formatDelta(diff, units)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function StatsTable({ current, candidate, units }: { current: ResolvedCar; candidate: ResolvedCar; units: Units }) {
  const keys = [...new Set([...Object.keys(current.stats ?? {}), ...Object.keys(candidate.stats ?? {})])]
  return (
    <>
      <DimTable current={current} candidate={candidate} units={units} />
      {keys.length > 0 && (
        <table className="table dims">
          <tbody>
            {keys.map((k) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{current.stats?.[k] ?? '—'}</td>
                <td>{candidate.stats?.[k] ?? '—'}</td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted small">More stats (power, economy, cargo, price) will fill in as the car data grows.</p>
    </>
  )
}

function GarageTab(p: {
  garage: Garage
  garageIsMine: boolean
  current: ResolvedCar
  candidate: ResolvedCar
  units: Units
  curPark: Parking
  candPark: Parking
  showCurrentInGarage: boolean
  onMove: (p: Parking) => void
  onReset: () => void
  onCenter: () => void
  onToggleCurrent: (v: boolean) => void
  onEditGarage: () => void
}) {
  const fit = checkFit(p.garage, p.candidate, p.candPark)
  const currentFit = checkFit(p.garage, p.current, p.curPark)
  return (
    <>
      {!p.garageIsMine && (
        <p className="banner">
          This is a sample 12 × 22 ft garage.{' '}
          <button className="link" onClick={p.onEditGarage}>
            Enter your garage’s measurements
          </button>{' '}
          to get real answers.
        </p>
      )}
      <div className="toolbar">
        <button className="btn" onClick={p.onEditGarage}>
          Edit garage
        </button>
        <button className="btn btn--quiet" onClick={p.onReset}>
          Same spot as my car
        </button>
        <button className="btn btn--quiet" onClick={p.onCenter}>
          Centre it
        </button>
        <label className="check">
          <input type="checkbox" checked={p.showCurrentInGarage} onChange={(e) => p.onToggleCurrent(e.target.checked)} /> Show my car
        </label>
      </div>
      <div className="garage-layout">
        <div className="stage stage--garage">
          <GarageView
            garage={p.garage}
            current={p.current}
            candidate={p.candidate}
            currentPark={p.curPark}
            candidatePark={p.candPark}
            onMove={p.onMove}
            showCurrent={p.showCurrentInGarage}
            units={p.units}
          />
          <p className="muted small center">Drag the orange car to re-park it.</p>
        </div>
        <FitPanel fit={fit} currentFit={currentFit} units={p.units} />
      </div>
    </>
  )
}

function Notes({ cars }: { cars: ResolvedCar[] }) {
  const names: Record<string, string> = {
    widthMirrors: 'mirror width',
    frontOverhang: 'front overhang',
    groundClearance: 'ground clearance',
  }
  return (
    <footer className="notes">
      {cars.map((c) => (
        <p key={c.id} className="small muted">
          <strong>{carFullName(c)}:</strong> {c.source}.
          {c.estimated.length > 0 && ` Estimated: ${c.estimated.map((e) => names[e]).join(', ')}.`}
        </p>
      ))}
      <p className="small muted">
        Car shapes are drawn from the dimensions; the outline is exactly to size, but the styling is generic.
      </p>
    </footer>
  )
}
