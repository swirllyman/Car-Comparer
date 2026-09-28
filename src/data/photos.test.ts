import { describe, expect, it } from 'vitest'
import { photoCandidates } from './photos'

describe('photoCandidates', () => {
  const thumb = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Car.jpg/320px-Car.jpg'
  const original = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Car.jpg'
  it('asks only for standard widths, sharpest first, then the originals', () => {
    expect(photoCandidates(thumb, original)).toEqual([
      thumb.replace('320px', '960px'),
      thumb.replace('320px', '500px'),
      thumb.replace('320px', '330px'),
      thumb,
      original,
    ])
  })
  it('never requests the old non-standard 640px size', () => {
    expect(photoCandidates(thumb, original).some((u) => u.includes('/640px-'))).toBe(false)
  })
  it('copes with no photo', () => {
    expect(photoCandidates(undefined, undefined)).toEqual([])
  })
})
