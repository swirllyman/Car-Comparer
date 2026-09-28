import { useEffect, useMemo, useRef, useState } from 'react'
import { searchCars, type Kind, type SortBy } from '../data/search'
import type { CarSpec, ResolvedCar, Units } from '../data/types'
import { portLabel } from '../geometry/charge'
import { carFullName, resolveCar } from '../geometry/resolve'
import { formatLength } from '../geometry/units'
import { EditIcon } from './icons'

const KINDS: { id: Kind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'suv', label: 'SUVs' },
  { id: 'truck', label: 'Trucks' },
  { id: 'minivan', label: 'Minivans' },
  { id: 'car', label: 'Cars' },
  { id: 'electric', label: 'Electric' },
]

interface Props {
  label: string
  tone: 'current' | 'candidate'
  selected: CarSpec
  cars: CarSpec[]
  recentIds: string[]
  /** The car sizes are compared against (the user's own car). */
  reference: ResolvedCar
  units: Units
  /** Whether a car fits the garage where the user's car parks; null when not worth showing. */
  fits: ((c: ResolvedCar) => boolean) | null
  garageIsMine: boolean
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
  const [kind, setKind] = useState<Kind>('all')
  const [sortBy, setSortBy] = useState<SortBy>('match')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => input.current?.focus(), [])

  const results = useMemo(() => {
    const found = searchCars(p.cars, query, kind, sortBy, (c) => resolveCar(c).widthMirrors)
    // With nothing typed, float recent picks to the top.
    if (query.trim() || sortBy !== 'match') return found
    const recent = p.recentIds.map((id) => found.find((c) => c.id === id)).filter((c): c is CarSpec => !!c)
    return [...recent, ...found.filter((c) => !recent.includes(c))]
  }, [p.cars, p.recentIds, query, kind, sortBy])

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
        onKeyDown={(e) => e.key === 'Escape' && p.onClose()}
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
        <div className="search__filters">
          {KINDS.map((k) => (
            <button key={k.id} className="chip" aria-pressed={kind === k.id} onClick={() => {
                setKind(k.id)
                setActive(0)
              }}>
              {k.label}
            </button>
          ))}
          <select value={sortBy} onChange={(e) => {
              setSortBy(e.target.value as SortBy)
              setActive(0)
            }} aria-label="Sort">
            <option value="match">Best match</option>
            <option value="length">Shortest first</option>
            <option value="width">Narrowest first</option>
          </select>
        </div>
        <p className="search__meta muted small">
          {results.length} {results.length === 1 ? 'car' : 'cars'} · sizes vs your {p.reference.model}
          {p.fits && (p.garageIsMine ? ' · fit checked against your garage' : ' · fit checked against the sample garage')}
        </p>
        <ul className="search__list" id="car-results" ref={list} role="listbox">
          {results.map((c, i) => {
            const r = resolveCar(c)
            const dl = r.length - p.reference.length
            const fits = p.fits?.(r)
            return (
              <li key={c.id}>
                {i === 0 && recentCount > 0 && <div className="search__group">Recent</div>}
                {i === recentCount && recentCount > 0 && <div className="search__group">All cars</div>}
                <button
                  role="option"
                  aria-selected={c.id === p.selected.id}
                  data-active={i === active}
                  className="result"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => p.onSelect(c.id)}
                >
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
                  {c.chargePorts?.length ? (
                    <span className="result__port muted">
                      ⚡ {c.chargePorts.map(portLabel).join(' + ')}
                      {c.portConfirmed === false ? ' (unconfirmed)' : ''}
                    </span>
                  ) : null}
                  {fits !== undefined && <span className={`badge badge--${fits ? 'ok' : 'bad'}`}>{fits ? 'Fits' : 'Too big'}</span>}
                </button>
              </li>
            )
          })}
        </ul>
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
