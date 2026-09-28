import { useState } from 'react'
import type { BodyType, CarSpec, Charger, Garage, Mm, Obstacle, Units } from '../data/types'
import { parsePorts } from '../data/catalog'
import { feet, fromUnit, inches, inputUnitLabel, toUnit } from '../geometry/units'

/** A length input that shows and accepts the user's units but stores mm. */
export function LengthInput({ label, value, units, onChange, hint, optional }: {
  label: string
  value: Mm | undefined
  units: Units
  onChange: (mm: Mm | undefined) => void
  hint?: string
  optional?: boolean
}) {
  // Keep the raw text so half-typed numbers like "73." aren't reformatted mid-edit.
  const shown = value === undefined ? '' : String(Number(toUnit(value, units).toFixed(2)))
  const [text, setText] = useState(shown)
  const [lastShown, setLastShown] = useState(shown)
  if (shown !== lastShown) {
    setLastShown(shown)
    setText(shown)
  }
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {optional && <span className="muted"> (optional)</span>}
      </span>
      <span className="field__input">
        <input
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            const n = parseFloat(e.target.value)
            if (e.target.value.trim() === '' && optional) onChange(undefined)
            else if (Number.isFinite(n)) onChange(fromUnit(n, units))
          }}
        />
        <span className="muted">{inputUnitLabel(units)}</span>
      </span>
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

export function GarageSetup({ garage, carWidth, units, onSave, onCancel }: {
  garage: Garage
  /** Body width of the current car, for "centre it". */
  carWidth: Mm
  units: Units
  onSave: (g: Garage) => void
  onCancel: () => void
}) {
  const [g, setG] = useState(garage)
  const set = (patch: Partial<Garage>) => setG((cur) => ({ ...cur, ...patch }))
  const setObstacle = (id: string, patch: Partial<Obstacle>) =>
    set({ obstacles: g.obstacles.map((o) => (o.id === id ? { ...o, ...patch } : o)) })
  const L = (k: keyof Garage, label: string, hint?: string) => (
    <LengthInput label={label} hint={hint} units={units} value={g[k] as Mm} onChange={(v) => set({ [k]: v ?? 0 })} />
  )
  return (
    <div className="sheet">
      <h2>My garage</h2>
      <p className="muted">
        Measure the inside of the garage at its narrowest points: wall to wall, and from the back wall to where the closed garage
        door sits. Everything is saved on this device.
      </p>
      <fieldset>
        <legend>The room</legend>
        {L('width', 'Inside width', 'Wall to wall, or to the edge of any shelving that runs the full length')}
        {L('depth', 'Inside depth', 'Back wall to the inside face of the closed door')}
      </fieldset>
      <fieldset>
        <legend>The garage door opening</legend>
        {L('doorWidth', 'Opening width')}
        {L('doorHeight', 'Opening height', 'Floor to the bottom of the open door or its track')}
        {L('doorOffset', 'Left wall to opening', 'Standing inside, facing the back wall: left wall to the nearest edge of the opening')}
      </fieldset>
      <fieldset>
        <legend>Where my current car parks</legend>
        <label className="field">
          <span className="field__label">How it parks</span>
          <select value={g.backedIn ? 'back' : 'nose'} onChange={(e) => set({ backedIn: e.target.value === 'back' })}>
            <option value="nose">Nose in (front toward the back wall)</option>
            <option value="back">Backed in (rear toward the back wall)</option>
          </select>
        </label>
        <div className="row">
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => set({ parkedLeftGap: Math.max(0, (g.width - carWidth) / 2) })}
          >
            Centre it between the walls
          </button>
        </div>
        {L('parkedLeftGap', 'Left wall to car body', 'Standing inside, facing the back wall; to the body, not the mirror')}
        {L('parkedFrontGap', g.backedIn ? 'Back wall to rear bumper' : 'Back wall to front bumper')}
      </fieldset>
      <fieldset>
        <legend>EV charger</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={!!g.charger}
            onChange={(e) =>
              set({ charger: e.target.checked ? { wall: 'left', along: Math.min(feet(10), g.depth / 2), cable: feet(24) } : undefined })
            }
          />{' '}
          I have a wall charger
        </label>
        {g.charger && (
          <>
            <label className="field">
              <span className="field__label">Which wall</span>
              <select
                value={g.charger.wall}
                onChange={(e) => set({ charger: { ...g.charger!, wall: e.target.value as Charger['wall'] } })}
              >
                <option value="left">Left wall (facing the back wall)</option>
                <option value="right">Right wall</option>
                <option value="back">Back wall</option>
              </select>
            </label>
            <LengthInput
              label={g.charger.wall === 'back' ? 'From the left wall' : 'From the back wall'}
              units={units}
              value={g.charger.along}
              onChange={(v) => set({ charger: { ...g.charger!, along: v ?? 0 } })}
            />
            <LengthInput
              label="Cable length"
              hint="Tesla Wall Connector: 24 ft (or 8.5 ft). Most other home chargers: 18–25 ft."
              units={units}
              value={g.charger.cable}
              onChange={(v) => set({ charger: { ...g.charger!, cable: v ?? 0 } })}
            />
          </>
        )}
      </fieldset>
      <fieldset>
        <legend>Things in the way</legend>
        <p className="muted">Workbenches, steps, freezers, bins… Position is from the left wall and the back wall to the item’s nearest corner.</p>
        {g.obstacles.map((o) => (
          <div key={o.id} className="obstacle">
            <label className="field">
              <span className="field__label">Name</span>
              <input value={o.label} onChange={(e) => setObstacle(o.id, { label: e.target.value })} />
            </label>
            <LengthInput label="From left wall" units={units} value={o.x} onChange={(v) => setObstacle(o.id, { x: v ?? 0 })} />
            <LengthInput label="From back wall" units={units} value={o.y} onChange={(v) => setObstacle(o.id, { y: v ?? 0 })} />
            <LengthInput label="Width (left–right)" units={units} value={o.w} onChange={(v) => setObstacle(o.id, { w: v ?? 0 })} />
            <LengthInput label="Depth (front–back)" units={units} value={o.d} onChange={(v) => setObstacle(o.id, { d: v ?? 0 })} />
            <button className="btn btn--quiet" onClick={() => set({ obstacles: g.obstacles.filter((x) => x.id !== o.id) })}>
              Remove
            </button>
          </div>
        ))}
        <button
          className="btn"
          onClick={() =>
            set({
              obstacles: [
                ...g.obstacles,
                { id: crypto.randomUUID(), label: 'Workbench', x: 0, y: 0, w: inches(24), d: inches(60) },
              ],
            })
          }
        >
          Add something
        </button>
      </fieldset>
      <div className="sheet__actions">
        <button className="btn btn--primary" onClick={() => onSave(g)}>
          Save garage
        </button>
        <button className="btn btn--quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/** The editor's single-port code for a car: "LF", "gas", "unknown" or "multi". */
function portCode(c: CarSpec): string {
  if (!c.ev && !c.chargePorts) return 'gas'
  const ports = c.chargePorts ?? []
  if (ports.length === 0) return 'unknown'
  if (ports.length > 1) return 'multi'
  const p = ports[0]
  return `${p.side === 'left' ? 'L' : p.side === 'right' ? 'R' : 'C'}${p.end === 'front' ? 'F' : 'R'}`
}

const BODY_TYPES: BodyType[] = ['sedan', 'hatchback', 'wagon', 'suv', 'minivan', 'truck']

export function CarEditor({ car, units, isOverride, onSave, onReset, onCancel }: {
  car: CarSpec
  units: Units
  /** True when this is an edited copy of a built-in car, so it can be reset. */
  isOverride: boolean
  onSave: (c: CarSpec) => void
  onReset?: () => void
  onCancel: () => void
}) {
  const [c, setC] = useState(car)
  const set = (patch: Partial<CarSpec>) => setC((cur) => ({ ...cur, ...patch }))
  const L = (k: keyof CarSpec, label: string, opts: { hint?: string; optional?: boolean } = {}) => (
    <LengthInput
      label={label}
      units={units}
      value={c[k] as Mm | undefined}
      optional={opts.optional}
      hint={opts.hint}
      onChange={(v) => set({ [k]: v })}
    />
  )
  return (
    <div className="sheet">
      <h2>Dimensions</h2>
      <p className="muted">
        Spec sheets vary, and mirror widths are often missing. For a car you have in front of you, a tape measure is the most
        accurate source there is.
      </p>
      <fieldset>
        <legend>Car</legend>
        <div className="row">
          <label className="field">
            <span className="field__label">Year</span>
            <input inputMode="numeric" value={c.year} onChange={(e) => set({ year: Number(e.target.value) || c.year })} />
          </label>
          <label className="field">
            <span className="field__label">Make</span>
            <input value={c.make} onChange={(e) => set({ make: e.target.value })} />
          </label>
        </div>
        <div className="row">
          <label className="field">
            <span className="field__label">Model</span>
            <input value={c.model} onChange={(e) => set({ model: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Trim</span>
            <input value={c.trim} onChange={(e) => set({ trim: e.target.value })} />
          </label>
        </div>
        <label className="field">
          <span className="field__label">Shape</span>
          <select value={c.bodyType} onChange={(e) => set({ bodyType: e.target.value as BodyType })}>
            {BODY_TYPES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Charge port</span>
          <select
            value={portCode(c)}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'gas') set({ ev: false, chargePorts: undefined, portConfirmed: undefined })
              else if (v === 'unknown') set({ ev: true, chargePorts: undefined, portConfirmed: undefined })
              else set({ ev: true, chargePorts: parsePorts(v).ports, portConfirmed: true })
            }}
          >
            <option value="gas">Not electric</option>
            <option value="LF">Driver side, front</option>
            <option value="LR">Driver side, rear</option>
            <option value="RF">Passenger side, front</option>
            <option value="RR">Passenger side, rear</option>
            <option value="CF">In the nose</option>
            {portCode(c) === 'multi' && <option value="multi">Several (as published)</option>}
            <option value="unknown">Electric, port unknown</option>
          </select>
        </label>
      </fieldset>
      <fieldset>
        <legend>Size</legend>
        {L('length', 'Length', { hint: 'Bumper to bumper, including any tow hitch' })}
        {L('widthBody', 'Width, body only', { hint: 'What most spec sheets list as “width”' })}
        {L('widthMirrors', 'Width, mirrors out', { optional: true, hint: 'Mirror tip to mirror tip, as when driving' })}
        {L('height', 'Height', { hint: 'Including roof rails' })}
        {L('wheelbase', 'Wheelbase', { hint: 'Centre of front wheel to centre of rear wheel' })}
        {L('frontOverhang', 'Front overhang', { optional: true, hint: 'Front bumper to front wheel centre' })}
        {L('groundClearance', 'Ground clearance', { optional: true })}
      </fieldset>
      <div className="sheet__actions">
        <button
          className="btn btn--primary"
          disabled={!(c.length > 0 && c.widthBody > 0 && c.height > 0 && c.wheelbase > 0 && c.wheelbase < c.length)}
          onClick={() => onSave({ ...c, custom: true, source: 'Entered by you' })}
        >
          Save
        </button>
        {isOverride && onReset && (
          <button className="btn btn--quiet" onClick={onReset}>
            Back to published numbers
          </button>
        )}
        <button className="btn btn--quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
