import type { Mm, Units } from '../data/types'

export const MM_PER_IN = 25.4

export const inches = (n: number): Mm => n * MM_PER_IN
export const feet = (ft: number, inch = 0): Mm => (ft * 12 + inch) * MM_PER_IN

/** A length for display, e.g. `180.9 in`, `15′ 0.9″` or `459.5 cm`. */
export function formatLength(mm: Mm, units: Units): string {
  if (units === 'cm') return `${(mm / 10).toFixed(1)} cm`
  const totalIn = mm / MM_PER_IN
  if (units === 'in') return `${totalIn.toFixed(1)} in`
  const sign = totalIn < 0 ? '−' : ''
  const abs = Math.abs(totalIn)
  let ft = Math.floor(abs / 12)
  let rest = Number((abs - ft * 12).toFixed(1))
  // 11.96 in rounds to 12.0; carry it rather than print 5′ 12.0″.
  if (rest >= 12) {
    ft += 1
    rest = 0
  }
  return ft > 0 ? `${sign}${ft}′ ${rest}″` : `${sign}${rest}″`
}

/** A signed difference, e.g. `+7.3 in` or `−1.2 in`; zero reads `same`. */
export function formatDelta(mm: Mm, units: Units): string {
  if (Math.abs(mm) < 0.5) return 'same'
  const body = formatLength(Math.abs(mm), units)
  return `${mm > 0 ? '+' : '−'}${body}`
}

/** The number a user would type for this length in the given units. */
export function toUnit(mm: Mm, units: Units): number {
  return units === 'cm' ? mm / 10 : mm / MM_PER_IN
}

export function fromUnit(value: number, units: Units): Mm {
  return units === 'cm' ? value * 10 : value * MM_PER_IN
}

/** Label for an input field; feet+inches is typed as plain inches. */
export function inputUnitLabel(units: Units): string {
  return units === 'cm' ? 'cm' : 'in'
}
