import { describe, expect, it } from 'vitest'
import { photoCandidates, pickSummary, summaryUrl } from './photos'

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

describe('pickSummary', () => {
  const car = (title: string, image?: string) => ({ title, description: 'SUV', thumbnail: image ? { source: image } : undefined })
  it('follows normalisation and redirects, preferring the first title with a photo', () => {
    const r = pickSummary(['Toyota RAV4 (XA50)', 'Toyota RAV4'], {
      query: {
        normalized: [],
        redirects: [{ from: 'Toyota RAV4 (XA50)', to: 'Toyota RAV4 (fifth generation)' }],
        pages: [car('Toyota RAV4 (fifth generation)'), car('Toyota RAV4', 'https://upload.wikimedia.org/x/thumb/a/b/R.jpg/960px-R.jpg')],
      },
    })
    expect(r?.title).toBe('Toyota RAV4')
    expect(r?.images[0]).toContain('/960px-')
  })
  it('falls back to a page without a photo, and skips missing pages', () => {
    const r = pickSummary(['Nope', 'Kia EV9'], { query: { pages: [{ title: 'Nope', missing: true }, car('Kia EV9')] } })
    expect(r?.title).toBe('Kia EV9')
    expect(r?.images).toEqual([])
  })
  it('asks for everything in one anonymous cross-site request', () => {
    const u = new URL(summaryUrl(['A', 'B']))
    expect(u.searchParams.get('origin')).toBe('*')
    expect(u.searchParams.get('titles')).toBe('A|B')
    expect(u.searchParams.get('pithumbsize')).toBe('960')
  })
})
