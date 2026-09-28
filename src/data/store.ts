import { useEffect, useState } from 'react'
import { inches } from '../geometry/units'
import { CARS, DEFAULT_CANDIDATE_ID, DEFAULT_CURRENT_ID } from './cars'
import type { Anchor, CarSpec, Garage, Units, View } from './types'

const KEY = 'car-comparer.v1'

export interface AppState {
  units: Units
  view: View
  anchor: Anchor
  currentId: string
  candidateId: string
  garage: Garage
  /** False until the user has saved their own garage measurements. */
  garageIsMine: boolean
  /** Hand-entered or edited cars; an entry with a built-in id overrides it. */
  customCars: CarSpec[]
  /** Most recently picked cars, newest first. */
  recentIds: string[]
}

/**
 * Our garage, measured, so anyone opening the shared link starts from it.
 * Each device can still change it under "Edit garage".
 */
export function defaultGarage(): Garage {
  return {
    width: inches(125),
    depth: inches(195),
    doorWidth: inches(95),
    doorHeight: inches(85),
    doorOffset: inches(18),
    // Centred both ways for the RAV4 (73 × 180.9 in), backed in.
    parkedLeftGap: inches((125 - 73) / 2),
    parkedFrontGap: inches((195 - 180.9) / 2),
    backedIn: true,
    obstacles: [],
    charger: { wall: 'right', along: inches(75), cable: inches(288) },
  }
}

export function freshState(): AppState {
  return {
    units: 'in',
    view: 'top',
    anchor: 'rear',
    currentId: DEFAULT_CURRENT_ID,
    candidateId: DEFAULT_CANDIDATE_ID,
    garage: defaultGarage(),
    garageIsMine: true,
    customCars: [],
    recentIds: [],
  }
}

function isEarlierDefault(g: Garage | undefined): boolean {
  const near = (mm: number, inch: number) => Math.abs(mm - inches(inch)) < 1
  return !!g && near(g.width, 125) && near(g.depth, 195) && near(g.parkedFrontGap, 24)
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return freshState()
    const saved = JSON.parse(raw) as Partial<AppState>
    // A garage nobody ever saved is the old sample, and one of our earlier
    // shared defaults (still on the sample's 24 in back-wall gap) predates
    // the centred one; either way, start from the current default.
    if (!saved.garageIsMine || isEarlierDefault(saved.garage)) {
      delete saved.garage
      delete saved.garageIsMine
    }
    return { ...freshState(), ...saved }
  } catch {
    // Unreadable storage should never stop the app; start from defaults.
    return freshState()
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Private mode / quota: keep working in memory.
    }
  }, [state])
  const update = (patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch }))
  return [state, update] as const
}

/** Built-in cars with any user edits applied, plus the user's own cars. */
export function allCars(custom: CarSpec[]): CarSpec[] {
  const byId = new Map(custom.map((c) => [c.id, c]))
  const merged = CARS.map((c) => byId.get(c.id) ?? c)
  const extra = custom.filter((c) => !CARS.some((b) => b.id === c.id))
  return [...merged, ...extra]
}

export function findCar(custom: CarSpec[], id: string): CarSpec {
  return allCars(custom).find((c) => c.id === id) ?? CARS[0]
}
