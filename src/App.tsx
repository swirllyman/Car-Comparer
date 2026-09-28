import { lazy, Suspense, useState, type ReactNode } from 'react'
import { CarPicker } from './components/CarPicker'
import { CompareView } from './components/CompareView'
import { CarEditor, GarageSetup } from './components/forms'
import { FitPanel, GarageView } from './components/GarageView'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CentreIcon, CubeIcon, EyeIcon, FrontIcon, GarageIcon, InfoIcon, ResetIcon, SideIcon, SwapIcon, TopIcon } from './components/icons'
import { useSize } from './components/useSize'
import { hasWebGL, importWithReload } from './scene/support'
import { CARS } from './data/cars'
import { isElectric } from './data/search'
import { allCars, findCar, useAppState } from './data/store'
import type { Anchor, CarSpec, ResolvedCar, Units, View } from './data/types'
import { checkCable, portLabel } from './geometry/charge'
import { compareCars, type Comparison } from './geometry/compare'
import { centredParking, checkFit, clearanceLevel, currentParking, DOOR_COMFORT, fitLevel, type Parking } from './geometry/fit'
import { carFullName, resolveCar } from './geometry/resolve'
import { formatDelta, formatLength, inches } from './geometry/units'

const Scene3D = lazy(importWithReload(() => import('./scene/Scene3D')))

type Tab = Exclude<View, 'stats'>

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'top', label: 'Top', icon: <TopIcon /> },
  { id: 'side', label: 'Side', icon: <SideIcon /> },
  { id: 'front', label: 'Front', icon: <FrontIcon /> },
  { id: '3d', label: '3D', icon: <CubeIcon /> },
  { id: 'garage', label: 'Garage', icon: <GarageIcon /> },
]

const ANCHORS: { id: Anchor; label: string }[] = [
  { id: 'rear', label: 'Rear' },
  { id: 'front', label: 'Front' },
  { id: 'center', label: 'Centre' },
]

const UNIT_CYCLE: Units[] = ['in', 'ftin', 'cm']
const UNIT_LABEL: Record<Units, string> = { in: 'in', ftin: 'ft·in', cm: 'cm' }

type Editing = { kind: 'garage' } | { kind: 'car'; which: 'currentId' | 'candidateId'; car: CarSpec } | null

/** A new car pre-filled from whatever was typed in search, e.g. "2026 Kia Telluride". */
function carFromQuery(q: string): CarSpec {
  const words = q.trim().split(/\s+/).filter(Boolean)
  const yearWord = words.find((w) => /^(19|20)\d\d$/.test(w))
  const rest = words.filter((w) => w !== yearWord)
  const title = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)
  return {
    ...NEW_CAR(),
    ...(yearWord ? { year: Number(yearWord) } : {}),
    ...(rest.length > 0 ? { make: title(rest[0]), model: rest.slice(1).map(title).join(' ') || 'Model' } : {}),
  }
}

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
  const [details, setDetails] = useState(false)
  const [candidatePark, setCandidatePark] = useState<Parking | null>(null)
  const [showCurrentInGarage, setShowCurrentInGarage] = useState(true)
  const [stageRef, box] = useSize<HTMLDivElement>()
  const { units, anchor, garage } = state
  // "stats" was a tab in earlier versions; it now lives in the details sheet.
  const view: Tab = state.view === 'stats' ? 'top' : state.view

  const cars = allCars(state.customCars)
  const current = resolveCar(findCar(state.customCars, state.currentId))
  const candidate = resolveCar(findCar(state.customCars, state.candidateId))
  const cmp = compareCars(current, candidate, anchor)

  const curPark = currentParking(garage, current)
  // By default the new car pulls up to the same stop, on the same line, facing the same way.
  const candPark = candidatePark ?? curPark

  const saveCar = (c: CarSpec, which: 'currentId' | 'candidateId') => {
    update({ customCars: [...state.customCars.filter((x) => x.id !== c.id), c], [which]: c.id })
    setEditing(null)
  }

  if (editing?.kind === 'garage') {
    return (
      <div className="page">
        <GarageSetup
          garage={garage}
          carWidth={current.widthBody}
          carLength={current.length}
          units={units}
          onCancel={() => setEditing(null)}
          onSave={(g) => {
            update({ garage: g, garageIsMine: true })
            setCandidatePark(null)
            setEditing(null)
          }}
        />
      </div>
    )
  }
  if (editing?.kind === 'car') {
    const builtIn = CARS.some((c) => c.id === editing.car.id)
    return (
      <div className="page">
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
      </div>
    )
  }

  const choose = (which: 'currentId' | 'candidateId', id: string) => {
    update({ [which]: id, recentIds: [id, ...state.recentIds.filter((r) => r !== id)].slice(0, 5) })
    setCandidatePark(null)
  }

  const picker = (which: 'currentId' | 'candidateId', label: string, tone: 'current' | 'candidate') => (
    <CarPicker
      label={label}
      tone={tone}
      selected={findCar(state.customCars, state[which])}
      cars={cars}
      recentIds={state.recentIds}
      reference={current}
      units={units}
      garageIsMine={state.garageIsMine}
      // Fit badges answer "will this replace my car?", so only on the other picker.
      fitLevel={which === 'candidateId' ? (c) => fitLevel(garage, c) : null}
      cableReaches={(c) => {
        const cable = checkCable(garage, c, centredParking(garage, c))
        return cable ? cable.needed <= cable.cable : null
      }}
      hasCharger={!!garage.charger}
      filters={state.filters}
      onFilters={(filters) => update({ filters })}
      onSelect={(id) => choose(which, id)}
      onEdit={() => setEditing({ kind: 'car', which, car: findCar(state.customCars, state[which]) })}
      onAdd={(q) => setEditing({ kind: 'car', which, car: carFromQuery(q) })}
    />
  )

  const fit = checkFit(garage, candidate, candPark)
  const currentFit = checkFit(garage, current, curPark)
  const cable = checkCable(garage, candidate, candPark)
  const currentCable = checkCable(garage, current, curPark)
  const editGarage = () => setEditing({ kind: 'garage' })

  return (
    <div className="shell">
      <header className="bar">
        {picker('currentId', 'My car', 'current')}
        <button
          className="iconbtn"
          aria-label="Swap cars"
          onClick={() => update({ currentId: state.candidateId, candidateId: state.currentId })}
        >
          <SwapIcon />
        </button>
        {picker('candidateId', 'Compare', 'candidate')}
      </header>

      <main className="stage" ref={stageRef}>
        <div className="stage__tools stage__tools--left">
          {view === 'garage' ? (
            <>
              <button className="pill" onClick={editGarage}>
                Edit garage
              </button>
              <button className="iconbtn iconbtn--small" aria-label="Same spot as my car" title="Same spot as my car" onClick={() => setCandidatePark(null)}>
                <ResetIcon />
              </button>
              <button
                className="iconbtn iconbtn--small"
                aria-label="Centre it"
                title="Centre it"
                onClick={() => setCandidatePark({ ...candPark, centerX: garage.width / 2, topY: (garage.depth - candidate.length) / 2 })}
              >
                <CentreIcon />
              </button>
              <button
                className="iconbtn iconbtn--small"
                aria-label={showCurrentInGarage ? 'Hide my car' : 'Show my car'}
                aria-pressed={showCurrentInGarage}
                title="Show my car"
                onClick={() => setShowCurrentInGarage(!showCurrentInGarage)}
              >
                <EyeIcon off={!showCurrentInGarage} />
              </button>
            </>
          ) : view !== 'front' ? (
            <div className="seg" role="group" aria-label="Line up by">
              <span className="seg__label">Line up</span>
              {ANCHORS.map((a) => (
                <button key={a.id} aria-pressed={anchor === a.id} onClick={() => update({ anchor: a.id })}>
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="stage__tools stage__tools--right">
          <button
            className="pill"
            aria-label="Change units"
            onClick={() => update({ units: UNIT_CYCLE[(UNIT_CYCLE.indexOf(units) + 1) % UNIT_CYCLE.length] })}
          >
            {UNIT_LABEL[units]}
          </button>
          <button className="iconbtn iconbtn--small" aria-label="Details" onClick={() => setDetails(true)}>
            <InfoIcon />
          </button>
        </div>

        <div className={`stage__drawing${view === 'garage' && !state.garageIsMine ? ' stage__drawing--notice' : ''}`}>
          {view === 'garage' ? (
            <GarageView
              garage={garage}
              current={current}
              candidate={candidate}
              currentPark={curPark}
              candidatePark={candPark}
              onMove={setCandidatePark}
              showCurrent={showCurrentInGarage}
              units={units}
              box={box}
            />
          ) : view === '3d' ? (
            <ErrorBoundary
              // Retry by reloading: a failed download stays failed until the page reloads.
              fallback={() => (
                <Unavailable3D onRetry={() => location.reload()} onTop={() => update({ view: 'top' })} reason="3D couldn’t start on this device." />
              )}
            >
              {hasWebGL() ? (
                <Suspense fallback={<p className="muted center">Loading 3D…</p>}>
                  <Scene3D current={current} candidate={candidate} candidateX={cmp.candidate.frontY} />
                </Suspense>
              ) : (
                <Unavailable3D onTop={() => update({ view: 'top' })} reason="This browser doesn’t support 3D graphics (WebGL)." />
              )}
            </ErrorBoundary>
          ) : (
            <CompareView current={current} candidate={candidate} cmp={cmp} view={view} units={units} box={box} />
          )}
        </div>

        {view === 'garage' && !state.garageIsMine && (
          <button className="stage__notice" onClick={editGarage}>
            Sample garage · <strong>set up yours</strong>
          </button>
        )}
      </main>

      {view === 'garage' ? (
        <GarageStrip
          fit={fit}
          currentFit={currentFit}
          cable={cable}
          isEv={isElectric(candidate)}
          hasCharger={!!garage.charger}
          units={units}
          onOpen={() => setDetails(true)}
        />
      ) : (
        <CompareStrip cmp={cmp} current={current} candidate={candidate} units={units} onOpen={() => setDetails(true)} />
      )}

      <nav className="tabbar" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={view === t.id} className="tabbar__tab" onClick={() => update({ view: t.id })}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {details && (
        <Sheet title={view === 'garage' ? 'Garage fit' : 'Size comparison'} onClose={() => setDetails(false)}>
          {view === 'garage' ? (
            <>
              <FitPanel
                fit={fit}
                currentFit={currentFit}
                cable={cable}
                currentCable={currentCable}
                isEv={isElectric(candidate)}
                hasCharger={!!garage.charger}
                onAddCharger={() => {
                  setDetails(false)
                  editGarage()
                }}
                units={units}
              />
              <p className="muted small">Drag the orange car in the garage to try other spots.</p>
            </>
          ) : (
            <StatsTable current={current} candidate={candidate} units={units} />
          )}
          <Notes cars={[current, candidate]} />
        </Sheet>
      )}
    </div>
  )
}

function Unavailable3D({ reason, onRetry, onTop }: { reason: string; onRetry?: () => void; onTop: () => void }) {
  return (
    <div className="unavailable">
      <p>
        <strong>{reason}</strong>
      </p>
      <p className="muted small">The Top, Side and Front views show the same sizes and work everywhere.</p>
      <div className="sheet__actions">
        <button className="btn btn--primary" onClick={onTop}>
          Go to Top view
        </button>
        {onRetry && (
          <button className="btn" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

/** A bottom sheet over the app; its content scrolls on its own if it must. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop sheet-backdrop--bottom" onClick={onClose}>
      <div className="bottomsheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <div className="bottomsheet__head">
          <h2>{title}</h2>
          <button className="btn btn--quiet" onClick={onClose} autoFocus>
            Done
          </button>
        </div>
        <div className="bottomsheet__body">{children}</div>
      </div>
    </div>
  )
}

type Level = 'bigger' | 'smaller' | 'same' | 'bad' | 'tight' | 'ok'

/** Tiles are tight on a phone: "15.2 in" → "15.2″". */
const tight = (s: string) => s.replace(/(\d) in\b/g, '$1″')

function Tile({ label, value, sub, level }: { label: string; value: string; sub?: string; level: Level }) {
  value = tight(value)
  sub = sub && tight(sub)
  return (
    <div className="tile">
      <span className="tile__label">{label}</span>
      <span className={`tile__value tile__value--${level}`}>{value}</span>
      {sub && <span className="tile__sub">{sub}</span>}
    </div>
  )
}

const deltaLevel = (mm: number): Level => (Math.abs(mm) < 0.5 ? 'same' : mm > 0 ? 'bigger' : 'smaller')

/** The key size differences at a glance; tap for the full table. */
function CompareStrip({ cmp, current, candidate, units, onOpen }: {
  cmp: Comparison
  current: ResolvedCar
  candidate: ResolvedCar
  units: Units
  onOpen: () => void
}) {
  const L = (mm: number) => formatLength(mm, units)
  const D = (mm: number) => formatDelta(mm, units)
  const ports = candidate.chargePorts?.length ? candidate.chargePorts.map(portLabel).join(' + ') : null
  return (
    <button className="strip" onClick={onOpen} aria-label="Show full comparison">
      <div className="strip__tiles">
        <Tile label="Length" value={D(cmp.length)} sub={L(candidate.length)} level={deltaLevel(cmp.length)} />
        <Tile label="Width" value={D(cmp.width)} sub={`${D(cmp.side)} a side`} level={deltaLevel(cmp.width)} />
        <Tile
          label="Mirrors"
          value={D(cmp.widthMirrors)}
          sub={candidate.estimated.includes('widthMirrors') || current.estimated.includes('widthMirrors') ? 'estimated' : L(candidate.widthMirrors)}
          level={deltaLevel(cmp.widthMirrors)}
        />
        <Tile label="Height" value={D(cmp.height)} sub={L(candidate.height)} level={deltaLevel(cmp.height)} />
      </div>
      <span className="strip__more">
        {ports ? `⚡ ${ports}${candidate.portConfirmed === false ? ' (unconfirmed)' : ''} · ` : ''}All details ›
      </span>
    </button>
  )
}

/** Fit verdict and the tightest clearances; tap for everything. */
function GarageStrip({ fit, currentFit, cable, isEv, hasCharger, units, onOpen }: {
  fit: ReturnType<typeof checkFit>
  currentFit: ReturnType<typeof checkFit>
  cable: ReturnType<typeof checkCable>
  isEv: boolean
  hasCharger: boolean
  units: Units
  onOpen: () => void
}) {
  const L = (mm: number) => formatLength(mm, units)
  const vs = (a: number, b: number) => (Math.abs(a - b) < 0.5 ? 'same as now' : `${formatDelta(a - b, units)} vs now`)
  const door = Math.min(fit.driverDoor.value, fit.passengerDoor.value)
  const doorNow = Math.min(currentFit.driverDoor.value, currentFit.passengerDoor.value)
  return (
    <button className="strip" onClick={onOpen} aria-label="Show full garage fit">
      <p className={`strip__verdict strip__verdict--${fit.fits ? 'ok' : 'bad'}`}>
        {fit.fits ? '✓ Fits, and the door closes' : '✕ Doesn’t fit where it’s parked'}
      </p>
      <div className="strip__tiles strip__tiles--3">
        <Tile label="Left" value={L(fit.left.value)} sub={vs(fit.left.value, currentFit.left.value)} level={clearanceLevel(fit.left.value)} />
        <Tile label="Right" value={L(fit.right.value)} sub={vs(fit.right.value, currentFit.right.value)} level={clearanceLevel(fit.right.value)} />
        <Tile label="To door" value={L(fit.rear.value)} sub={vs(fit.rear.value, currentFit.rear.value)} level={clearanceLevel(fit.rear.value)} />
        <Tile label="Back wall" value={L(fit.front.value)} sub={vs(fit.front.value, currentFit.front.value)} level={clearanceLevel(fit.front.value)} />
        <Tile label="Door room" value={L(door)} sub={vs(door, doorNow)} level={clearanceLevel(door, DOOR_COMFORT)} />
        {isEv ? (
          <Tile
            label="Cable"
            value={!hasCharger ? 'No charger' : cable ? `${formatLength(cable.needed, units === 'cm' ? 'cm' : 'ftin')}` : 'Port ?'}
            sub={!hasCharger ? 'add in Edit garage' : cable ? `of ${formatLength(cable.cable, units === 'cm' ? 'cm' : 'ftin')}` : 'location unknown'}
            level={!cable ? 'same' : cable.needed > cable.cable ? 'bad' : cable.cable - cable.needed < inches(24) ? 'tight' : 'ok'}
          />
        ) : (
          <Tile label="Door height" value={L(fit.doorwayTop)} sub="above roof" level={clearanceLevel(fit.doorwayTop)} />
        )}
      </div>
    </button>
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
        {(isElectric(current) || isElectric(candidate)) && (
          <tr>
            <th>Charge port</th>
            <td>{portText(current)}</td>
            <td>{portText(candidate)}</td>
            <td />
          </tr>
        )}
      </tbody>
    </table>
  )
}

function portText(c: ResolvedCar): string {
  if (!isElectric(c)) return '—'
  if (!c.chargePorts?.length) return 'unknown'
  return c.chargePorts.map(portLabel).join(' + ') + (c.portConfirmed === false ? ' (unconfirmed)' : '')
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
