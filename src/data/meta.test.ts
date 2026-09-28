import { describe, expect, it } from 'vitest'
import { CARS } from './cars'
import { missingMeta } from './meta'

describe('car metadata', () => {
  it('covers every built-in car', () => {
    expect(missingMeta(CARS)).toEqual([])
  })
  it('gives EVs an electric powertrain and nothing else', () => {
    for (const c of CARS.filter((c) => c.ev)) expect(c.power).toEqual(['ev'])
  })
})
