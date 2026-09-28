import { useEffect, useMemo, useRef, useState } from 'react'
import { activeFilters, NO_FILTERS, passes, powerOf, searchCars, type Body, type Filters, type SortBy } from '../data/search'
import type { CarSpec, Power, ResolvedCar, Units } from '../data/types'
import { portLabel } from '../geometry/charge'
import type { FitInfo } from '../geometry/fit'
import { carFullName, resolveCar } from '../geometry/resolve'
import { formatLength } from '../geometry/units'
import { CarInfo } from './CarInfo'
import { EditIcon, InfoIcon } from './icons'

const POWERS: { id: Power; label: string }[] = [
  { id: 'ev', label: 'Electric' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'phev', label: 'Plug-in' },
  { id: 'gas', label: 'Gas' },
]

const BODIES: { id: Body; label: string }[] = [
  { id: 'suv', label: 'SUV' },
  { id: 'truck', label: 'Truck' },
  { id: 'minivan', label: 'Minivan' },
  { id: 'car', label: 'Car' },
]

const POWER_LABEL: Record<Power, string> = { ev: 'Electric', hybrid: 'Hybrid', phev: 'Plug-in', gas: 'Gas' }

const seatText = (c: CarSpec) => (c.seats ? (c.seats[0] === c.seats[1] ? `${c.seats[0]} seats` : `${c.seats[0]}–${c.seats[1]} seats`) : null)

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])



interface Props {
  label: string
  tone: 'current' | 'candidate'
  selected: CarSpec
  cars: CarSpec[]
  recentIds: string[]
  /** The car sizes are compared against (the user's own car). */
  reference: ResolvedCar
  units: Units
  /** How a car fits the garage (centred); null on the picker where it isn't worth showing. */
  fitLevel: ((c: ResolvedCar) => FitInfo) | null
  /** Whether the charger's cable reaches the car's port; null when there's no answer. */
  cableReaches: (c: ResolvedCar) => boolean | null
  hasCharger: boolean
  garageIsMine: boolean
  filters: Filters
  onFilters: (f: Filters) => void
  onSelect: (id: string) => void
  onEdit: () => void
  onAdd: (query: string) => void
}

/** A compact chip naming the chosen car; tapping it opens a search-as-you-type list. */
export function CarPicker(p: Props) {
  const [open, setOpen] = useState(false)
  const c = p.selected
  return (
    <>
      <button className={`carchip carchip--${p.tone}`} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`${p.label}: ${carFullName(c)}. Change`}>
        <span className="carchip__label">
          <span className={`swatch swatch--${p.tone}`} /> {p.label}
        </span>
        <span className="carchip__name">
          {c.make} {c.model}
        </span>
        <span className="carchip__trim">
          {c.year}
          {c.trim ? ` · ${c.trim}` : ''}
        </span>
      </button>
      {open && (
        <SearchSheet
          {...p}
          onClose={() => setOpen(false)}
          onSelect={(id) => {
            setOpen(false)
            p.onSelect(id)
          }}
          onEdit={() => {
            setOpen(false)
            p.onEdit()
          }}
          onAdd={(q) => {
            setOpen(false)
            p.onAdd(q)
          }}
        />
      )}
    </>
  )
}

function SearchSheet(p: Props & { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('match')
  const [active, setActive] = useState(0)
  const [info, setInfo] = useState<CarSpec | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => input.current?.focus(), [])

  // The garage filters only make sense on the "Compare" picker.
  const hasGarage = !!p.fitLevel
  const f = useMemo(() => (hasGarage ? p.filters : { ...p.filters, fits: false, cable: false }), [hasGarage, p.filters])
  const setF = (patch: Partial<Filters>) => {
    p.onFilters({ ...p.filters, ...patch })
    setActive(0)
  }
  const { fitLevel, cableReaches } = p
  const results = useMemo(() => {
    const checks = {
      fits: (c: CarSpec) => (fitLevel ? fitLevel(resolveCar(c)).level !== 'no' : true),
      cableReaches: (c: CarSpec) => cableReaches(resolveCar(c)),
    }
    const found = searchCars(p.cars, query, (c) => passes(c, f, checks), sortBy, (c) => resolveCar(c).widthMirrors)
    // With nothing typed, float recent picks to the top.
    if (query.trim() || sortBy !== 'match') return found
    const recent = p.recentIds.map((id) => found.find((c) => c.id === id)).filter((c): c is CarSpec => !!c)
    return [...recent, ...found.filter((c) => !recent.includes(c))]
  }, [p.cars, p.recentIds, query, f, sortBy, fitLevel, cableReaches])

  useEffect(() => {
    list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActive((i) => Math.min(i + 1, results.length - 1))
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0))
    else if (e.key === 'Enter' && results[active]) p.onSelect(results[active].id)
    else return
    e.preventDefault()
  }

  const L = (mm: number) => formatLength(mm, p.units)
  const webQuery = encodeURIComponent(`${query.trim() || 'car'} dimensions length width height wheelbase mirrors`)
  const recentCount = !query.trim() && sortBy === 'match' ? p.recentIds.filter((id) => results.some((c) => c.id === id)).length : 0

  return (
    <div className="sheet-backdrop" onClick={p.onClose}>
      <div
        className="search"
        role="dialog"
        aria-label={`Choose: ${p.label}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && (info ? setInfo(null) : p.onClose())}
      >
        <div className="search__head">
          <input
            ref={input}
            className="search__input"
            type="search"
            placeholder="Search make, model, year or type…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            aria-controls="car-results"
          />
          <button className="btn btn--quiet" onClick={p.onClose}>
            Close
          </button>
        </div>
        <button className="search__edit" onClick={p.onEdit}>
          <EditIcon />
          <span>
            Edit dimensions of <strong>{carFullName(p.selected)}</strong>
          </span>
        </button>
        <div className="search__filters" role="group" aria-label="Filters">
          {p.fitLevel && (
            <button className="chip chip--key" aria-pressed={f.fits} onClick={() => setF({ fits: !p.filters.fits })}>
              ✓ Fits my garage
            </button>
          )}
          {p.fitLevel && p.hasCharger && (
            <button className="chip chip--key" aria-pressed={f.cable} onClick={() => setF({ cable: !p.filters.cable })}>
              ⚡ Charger reaches
            </button>
          )}
          <select
            className={`chip chip--select${f.seats ? ' chip--on' : ''}`}
            value={f.seats}
            onChange={(e) => setF({ seats: Number(e.target.value) })}
            aria-label="Seats"
          >
            <option value={0}>Any seats</option>
            <option value={5}>5+ seats</option>
            <option value={6}>6+ seats</option>
            <option value={7}>7+ seats</option>
            <option value={8}>8+ seats</option>
          </select>
          {POWERS.map((x) => (
            <button key={x.id} className="chip" aria-pressed={f.power.includes(x.id)} onClick={() => setF({ power: toggle(p.filters.power, x.id) })}>
              {x.label}
            </button>
          ))}
          <button className="chip" aria-pressed={f.awd} onClick={() => setF({ awd: !p.filters.awd })}>
            AWD
          </button>
          {BODIES.map((x) => (
            <button key={x.id} className="chip" aria-pressed={f.body.includes(x.id)} onClick={() => setF({ body: toggle(p.filters.body, x.id) })}>
              {x.label}
            </button>
          ))}
          <select
            className="chip chip--select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortBy)
              setActive(0)
            }}
            aria-label="Sort"
          >
            <option value="match">Best match</option>
            <option value="length">Shortest first</option>
            <option value="width">Narrowest first</option>
          </select>
        </div>
        <p className="search__meta muted small">
          {results.length} {results.length === 1 ? 'car' : 'cars'}
          {activeFilters(f) > 0 && (
            <>
              {' · '}
              <button className="link" onClick={() => p.onFilters(NO_FILTERS)}>
                clear {activeFilters(f)} {activeFilters(f) === 1 ? 'filter' : 'filters'}
              </button>
            </>
          )}
          {' · '}sizes vs your {p.reference.model}
          {p.fitLevel && (p.garageIsMine ? ' · fit: centred in your garage' : ' · fit: centred in the sample garage')}
        </p>
        <ul className="search__list" id="car-results" ref={list} role="listbox">
          {results.map((c, i) => {
            const r = resolveCar(c)
            const dl = r.length - p.reference.length
            const fit = p.fitLevel?.(r)
            const level = fit?.level
            const cable = p.fitLevel ? p.cableReaches(r) : null
            const tags = [seatText(c), powerOf(c).map((x) => POWER_LABEL[x]).join('/') || null, c.awd === false ? 'FWD only' : c.awd ? 'AWD' : null].filter(Boolean)
            return (
              <li key={c.id}>
                {i === 0 && recentCount > 0 && <div className="search__group">Recent</div>}
                {i === recentCount && recentCount > 0 && <div className="search__group">All cars</div>}
                <div className="result-row" data-active={i === active} onMouseEnter={() => setActive(i)}>
                  <button role="option" aria-selected={c.id === p.selected.id} className="result" onClick={() => p.onSelect(c.id)}>
                    <span className="result__name">
                      {c.year} {c.make} {c.model}
                      {c.trim && <span className="muted"> {c.trim}</span>}
                      {c.custom && <span className="muted"> ✎</span>}
                    </span>
                    <span className="result__size muted">
                      {L(r.length)} long · {L(r.widthMirrors)} with mirrors{r.estimated.includes('widthMirrors') ? '*' : ''}
                      {' · '}
                      <span className={`delta delta--${Math.abs(dl) < 0.5 ? 'same' : dl > 0 ? 'bigger' : 'smaller'}`}>
                        {Math.abs(dl) < 0.5 ? 'same length' : `${formatLength(Math.abs(dl), p.units)} ${dl > 0 ? 'longer' : 'shorter'}`}
                      </span>
                    </span>
                    <span className="result__port muted">
                      {tags.join(' · ')}
                      {c.chargePorts?.length ? ` · ⚡ ${c.chargePorts.map(portLabel).join(' + ')}${c.portConfirmed === false ? ' (unconfirmed)' : ''}` : ''}
                    </span>
                  </button>
                  <div className="result__side">
                    {level && (
                      <span className={`badge badge--${level === 'fits' ? 'ok' : level === 'tight' ? 'tight' : 'bad'}`}>
                        {level === 'fits' ? 'Fits' : level === 'tight' ? `Tight ${formatLength(fit!.room, p.units).replace(/(\d) in$/, '$1″')}` : 'Too big'}
                      </span>
                    )}
                    {cable !== null && <span className={`badge badge--${cable ? 'ok' : 'bad'}`}>⚡ {cable ? 'reaches' : 'short'}</span>}
                    <button className="infobtn" aria-label={`About the ${c.year} ${c.make} ${c.model}`} onClick={() => setInfo(c)}>
                      <InfoIcon />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        {info && (
          <CarInfo
            car={info}
            reference={p.reference}
            units={p.units}
            fit={p.fitLevel?.(resolveCar(info))}
            cable={p.fitLevel ? p.cableReaches(resolveCar(info)) : null}
            isSelected={info.id === p.selected.id}
            onPick={() => p.onSelect(info.id)}
            onClose={() => setInfo(null)}
          />
        )}
        <div className="search__foot">
          <p className="small">
            <strong>Can’t find it?</strong> Look up its dimensions, then add it.
            <span className="muted"> * mirror width estimated</span>
          </p>
          <div className="search__actions">
            <a className="btn" href={`https://www.google.com/search?q=${webQuery}`} target="_blank" rel="noreferrer">
              Find specs ↗
            </a>
            <button className="btn btn--primary" onClick={() => p.onAdd(query)}>
              Add a car
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
