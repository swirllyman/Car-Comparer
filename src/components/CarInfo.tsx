import { useEffect, useState } from 'react'
import { carSummary, type SummaryResult } from '../data/photos'
import { isElectric, powerOf } from '../data/search'
import type { CarSpec, Power, ResolvedCar, Units } from '../data/types'
import { portLabel } from '../geometry/charge'
import type { FitInfo } from '../geometry/fit'
import { resolveCar } from '../geometry/resolve'
import { formatDelta, formatLength } from '../geometry/units'
import { CarSide } from './draw'

const POWER_LABEL: Record<Power, string> = { ev: 'Electric', hybrid: 'Hybrid', phev: 'Plug-in hybrid', gas: 'Gas' }

const BODY_LABEL: Record<CarSpec['bodyType'], string> = {
  sedan: 'Sedan',
  hatchback: 'Hatchback',
  wagon: 'Wagon',
  suv: 'SUV',
  minivan: 'Minivan',
  truck: 'Pickup truck',
}

/** The photo's space while it loads, or for good when there isn't one: the app's own drawing, to scale. */
function Silhouette({ car }: { car: ResolvedCar }) {
  const pad = 120
  return (
    <svg className="info__drawing" viewBox={`${-pad} ${-car.height - pad} ${car.length + 2 * pad} ${car.height + 2 * pad}`} aria-hidden>
      <line x1={-pad} y1={0} x2={car.length + pad} y2={0} className="ground" />
      <CarSide car={car} x={0} y={0} variant="current" />
    </svg>
  )
}

export function CarInfo({ car: spec, reference, units, fit, cable, isSelected, onPick, onClose }: {
  car: CarSpec
  reference: ResolvedCar
  units: Units
  fit?: FitInfo
  cable: boolean | null
  isSelected: boolean
  onPick: () => void
  onClose: () => void
}) {
  const car = resolveCar(spec)
  const [result, setResult] = useState<SummaryResult | undefined>(undefined)
  // Which photo candidate we're on; past the end means none would load.
  const [imgIndex, setImgIndex] = useState(0)
  useEffect(() => {
    let live = true
    carSummary(spec).then((s) => live && setResult(s))
    return () => {
      live = false
    }
  }, [spec])

  const summary = result === 'unreachable' ? null : result
  const photo = summary?.images[imgIndex]
  const L = (mm: number) => formatLength(mm, units)
  const D = (mm: number, what: string) => (Math.abs(mm) < 0.5 ? `same ${what}` : `${formatDelta(mm, units)} ${what}`)
  const est = (k: ResolvedCar['estimated'][number]) => (car.estimated.includes(k) ? ' (est.)' : '')
  const seats = spec.seats ? (spec.seats[0] === spec.seats[1] ? `${spec.seats[0]}` : `${spec.seats[0]}–${spec.seats[1]}`) : '—'
  const rows: [string, string][] = [
    ['Body', BODY_LABEL[spec.bodyType]],
    ['Seats', seats],
    ['Powertrain', powerOf(spec).map((p) => POWER_LABEL[p]).join(', ') || '—'],
    ['Drive', spec.awd === false ? 'Front-wheel drive only' : spec.awd ? 'AWD available' : '—'],
    ['Length', L(car.length)],
    ['Width, mirrors out', L(car.widthMirrors) + est('widthMirrors')],
    ['Width, body', L(car.widthBody)],
    ['Height', L(car.height)],
    ['Wheelbase', L(car.wheelbase)],
    ['Ground clearance', L(car.groundClearance) + est('groundClearance')],
  ]
  if (isElectric(spec)) {
    rows.push([
      'Charge port',
      spec.chargePorts?.length ? spec.chargePorts.map(portLabel).join(' + ') + (spec.portConfirmed === false ? ' (unconfirmed)' : '') : 'unknown',
    ])
  }
  for (const [k, v] of Object.entries(spec.stats ?? {})) rows.push([k, v])

  return (
    <div className="info" role="dialog" aria-label={`About the ${spec.make} ${spec.model}`}>
      <div className="info__head">
        <div>
          <h2>
            {spec.year} {spec.make} {spec.model}
          </h2>
          {(spec.trim || summary?.description) && (
            <p className="muted small">{[spec.trim, summary?.description].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <button className="btn btn--quiet" onClick={onClose}>
          Back
        </button>
      </div>
      <div className="info__body">
        <figure className="info__photo">
          {photo ? (
            <img src={photo} alt={`${spec.make} ${spec.model}`} onError={() => setImgIndex((i) => i + 1)} />
          ) : (
            <Silhouette car={car} />
          )}
          <figcaption className="muted small">
            {result === undefined ? (
              'Looking for a photo…'
            ) : result === 'unreachable' ? (
              'Couldn’t reach Wikipedia for a photo; drawn to scale from the dimensions.'
            ) : photo ? (
              <>
                Photo:{' '}
                <a href={summary!.page} target="_blank" rel="noreferrer">
                  Wikipedia
                </a>{' '}
                · may show a different year or trim
              </>
            ) : summary?.images.length ? (
              'The photo couldn’t load; drawn to scale from the dimensions.'
            ) : (
              'No photo found; drawn to scale from the dimensions.'
            )}
          </figcaption>
        </figure>

        <div className="info__chips">
          {fit && (
            <span className={`badge badge--${fit.level === 'fits' ? 'ok' : fit.level === 'tight' ? 'tight' : 'bad'}`}>
              {fit.level === 'fits'
                ? `Fits · ${L(fit.room)} to spare`
                : fit.level === 'tight'
                  ? `Tight · ${L(fit.room)} at the closest`
                  : 'Too big for the garage'}
            </span>
          )}
          {cable !== null && <span className={`badge badge--${cable ? 'ok' : 'bad'}`}>⚡ charger {cable ? 'reaches' : 'too short'}</span>}
        </div>
        <p className="info__vs">
          vs your {reference.model}: <strong>{D(car.length - reference.length, 'long')}</strong> ·{' '}
          <strong>{D(car.widthMirrors - reference.widthMirrors, 'wide')}</strong> ·{' '}
          <strong>{D(car.height - reference.height, 'tall')}</strong>
        </p>

        <table className="table info__table">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {summary?.extract && (
          <p className="muted small">
            {summary.extract.length > 360 ? `${summary.extract.slice(0, 360).replace(/\s+\S*$/, '')}…` : summary.extract}{' '}
            <a href={summary.page} target="_blank" rel="noreferrer">
              More on Wikipedia ↗
            </a>
          </p>
        )}
        <p className="muted small">{spec.source}.</p>
      </div>
      <div className="info__foot">
        <button className="btn btn--primary" onClick={onPick} disabled={isSelected}>
          {isSelected ? 'Already selected' : 'Compare with this car'}
        </button>
      </div>
    </div>
  )
}
