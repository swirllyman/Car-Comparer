import { useEffect, useState } from 'react'
import { feet, inches } from '../geometry/units'
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
}

/** A plain single-car garage with the current car parked in the middle. */
export function sampleGarage(): Garage {
  return {
    width: feet(12),
    depth: feet(22),
    doorWidth: feet(9),
    doorHeight: feet(7),
    doorOffset: feet(1.5),
    parkedLeftGap: inches(35.5),
    parkedFrontGap: inches(24),
    obstacles: [],
  }
}

export function freshState(): AppState {
  return {
    units: 'in',
    view: 'top',
    anchor: 'rear',
    currentId: DEFAULT_CURRENT_ID,
    candidateId: DEFAULT_CANDIDATE_ID,
    garage: sampleGarage(),
    garageIsMine: false,
    customCars: [],
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return freshState()
    return { ...freshState(), ...(JSON.parse(raw) as Partial<AppState>) }
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
