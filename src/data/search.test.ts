import { describe, expect, it } from 'vitest'
import { CARS } from './cars'
import { matchesKind, NO_FILTERS, passes, scoreCar, searchCars, type Filters, type Kind } from './search'

const find = (q: string, kind: Kind = 'all') =>
  searchCars(CARS, q, (c) => matchesKind(c, kind), 'match', (c) => c.widthBody).map((c) => `${c.make} ${c.model}`)
const filtered = (f: Partial<Filters>) =>
  searchCars(CARS, '', (c) => passes(c, { ...NO_FILTERS, ...f }), 'match', (c) => c.widthBody).map((c) => `${c.make} ${c.model}`)

describe('car search', () => {
  it('forgives punctuation and partial words', () => {
    expect(find('cx5')[0]).toBe('Mazda CX-5')
    expect(find('f150')[0]).toBe('Ford F-150')
    expect(find('rav')).toContain('Toyota RAV4 Hybrid')
    expect(find('model y')[0]).toBe('Tesla Model Y')
  })
  it('needs every word to match', () => {
    expect(find('honda truck')).toEqual(['Honda Ridgeline'])
    expect(find('toyota zzz')).toEqual([])
  })
  it('understands body types and electric', () => {
    expect(find('minivan').length).toBeGreaterThanOrEqual(4)
    expect(find('', 'electric')).toContain('Rivian R1S')
    expect(find('', 'electric')).not.toContain('Toyota Camry')
    expect(find('pickup')).toContain('Ram 1500')
  })
  it('treats a year as a preference, not a filter', () => {
    expect(find('2026 kia telluride')).toEqual(['Kia Telluride'])
    expect(find('2019 rav4')[0]).toBe('Toyota RAV4 Hybrid')
    expect(find('1999')).toEqual([])
  })
  it('ranks whole-word matches above substrings', () => {
    const exact = CARS.find((c) => c.model === 'Model 3')!
    expect(scoreCar(exact, 'model 3')).toBeGreaterThan(scoreCar(exact, 'mod'))
  })
  it('sorts shortest first on request', () => {
    const r = searchCars(CARS, '', () => true, 'length', (c) => c.widthBody)
    expect(r[0].length).toBeLessThanOrEqual(r[r.length - 1].length)
  })
  it('filters by seats, powertrain, body and AWD together', () => {
    const r = filtered({ seats: 7, power: ['hybrid'] })
    expect(r).toContain('Toyota Sienna')
    expect(r).toContain('Toyota Grand Highlander')
    expect(r).not.toContain('Toyota RAV4 Hybrid')
    expect(filtered({ body: ['minivan'], awd: true })).not.toContain('Honda Odyssey')
    expect(filtered({ power: ['ev'], seats: 6 })).toContain('Tesla Model Y L')
  })
  it('uses garage checks when given', () => {
    const g = { fits: (c: { length: number }) => c.length < 4700, cableReaches: () => null }
    const r = searchCars(CARS, '', (c) => passes(c, { ...NO_FILTERS, fits: true }, g), 'match', (c) => c.widthBody)
    expect(r.every((c) => c.length < 4700)).toBe(true)
    // Nothing passes "charger reaches" when no car has a known answer.
    expect(searchCars(CARS, '', (c) => passes(c, { ...NO_FILTERS, cable: true }, g), 'match', (c) => c.widthBody)).toEqual([])
  })
  it('has unique ids', () => {
    expect(new Set(CARS.map((c) => c.id)).size).toBe(CARS.length)
  })
})
