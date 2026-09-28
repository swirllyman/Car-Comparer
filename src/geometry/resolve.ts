import type { CarSpec, ResolvedCar } from '../data/types'
import { inches } from './units'

/**
 * Fill in the optional dimensions a spec sheet didn't give us, remembering
 * which ones were guessed so the UI can say "estimated".
 */
export function resolveCar(spec: CarSpec): ResolvedCar {
  const estimated: ResolvedCar['estimated'] = []

  let widthMirrors = spec.widthMirrors
  if (widthMirrors === undefined) {
    // Published mirrors-out spans run ~8–11 in over the body for cars and
    // SUVs and ~15 in for full-size trucks with their tow-style heads.
    widthMirrors = spec.widthBody + inches(spec.bodyType === 'truck' ? 15 : 10)
    estimated.push('widthMirrors')
  }

  let frontOverhang = spec.frontOverhang
  if (frontOverhang === undefined) {
    // Most cars split the overhang a little front-heavy; trucks carry the bed
    // out back.
    const overhangs = spec.length - spec.wheelbase
    frontOverhang = overhangs * (spec.bodyType === 'truck' ? 0.42 : 0.48)
    estimated.push('frontOverhang')
  }

  let groundClearance = spec.groundClearance
  if (groundClearance === undefined) {
    groundClearance = inches(spec.bodyType === 'sedan' || spec.bodyType === 'hatchback' ? 5.5 : 7.5)
    estimated.push('groundClearance')
  }

  return { ...spec, widthMirrors, frontOverhang, groundClearance, estimated }
}

export const carName = (c: CarSpec) => `${c.year} ${c.make} ${c.model}`
export const carFullName = (c: CarSpec) => `${carName(c)} ${c.trim}`.trim()
