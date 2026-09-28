import type { BodyType, CarSpec } from './types'

export type Kind = 'all' | 'suv' | 'truck' | 'minivan' | 'car' | 'electric'

const ELECTRIC = /tesla|rivian|ioniq|\bev\d|\bev\b|mach-e|cybertruck/i

export const isElectric = (c: CarSpec) => !!c.ev || ELECTRIC.test(`${c.make} ${c.model}`)

const KIND_OF: Record<BodyType, Kind> = {
  suv: 'suv',
  truck: 'truck',
  minivan: 'minivan',
  sedan: 'car',
  hatchback: 'car',
  wagon: 'car',
}

export function matchesKind(c: CarSpec, kind: Kind): boolean {
  if (kind === 'all') return true
  if (kind === 'electric') return isElectric(c)
  return KIND_OF[c.bodyType] === kind
}

/** Words people use for a body type that the data doesn't spell out. */
const SYNONYMS: Record<BodyType, string> = {
  suv: 'suv crossover',
  truck: 'truck pickup',
  minivan: 'minivan van',
  sedan: 'sedan car',
  hatchback: 'hatchback car',
  wagon: 'wagon car',
}

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function haystack(c: CarSpec) {
  const text = `${c.year} ${c.make} ${c.model} ${c.trim} ${SYNONYMS[c.bodyType]}${isElectric(c) ? ' electric ev' : ''}`.toLowerCase()
  return { words: text.split(/[^a-z0-9]+/).filter(Boolean), all: compact(text) }
}

const isYear = (t: string) => /^(19|20)\d\d$/.test(t)

/**
 * Score a car against a free-text query. Every word typed must match
 * something, forgivingly: "cx5" finds "CX-5", "rav" finds "RAV4", "f150"
 * finds "F-150". A year only ranks, it doesn't exclude — a 2026 search
 * should still surface the 2025 car, since sizes rarely change between
 * years of the same generation. Returns 0 for no match.
 */
export function scoreCar(c: CarSpec, query: string): number {
  const tokens = query.toLowerCase().split(/\s+/).map(compact).filter(Boolean)
  if (tokens.length === 0) return 1
  const soft = tokens.some((t) => !isYear(t))
  const h = haystack(c)
  let score = 1
  for (const t of tokens) {
    if (h.words.includes(t)) score += 3
    else if (h.words.some((w) => w.startsWith(t))) score += 2
    else if (h.all.includes(t)) score += 1
    else if (!(soft && isYear(t))) return 0
  }
  return score
}

export type SortBy = 'match' | 'length' | 'width'

export function searchCars(
  cars: CarSpec[],
  query: string,
  kind: Kind,
  sortBy: SortBy,
  widthOf: (c: CarSpec) => number,
): CarSpec[] {
  const scored = cars
    .filter((c) => matchesKind(c, kind))
    .map((c) => ({ c, s: scoreCar(c, query) }))
    .filter((x) => x.s > 0)
  const byName = (a: CarSpec, b: CarSpec) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`) || b.year - a.year
  scored.sort((a, b) => {
    if (sortBy === 'length') return a.c.length - b.c.length
    if (sortBy === 'width') return widthOf(a.c) - widthOf(b.c)
    return b.s - a.s || byName(a.c, b.c)
  })
  return scored.map((x) => x.c)
}
