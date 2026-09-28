import type { CarSpec } from './types'

/**
 * Car photos and one-line summaries from Wikipedia's page-summary API, which
 * allows cross-site requests and serves freely licensed Commons images.
 * Wikipedia titles don't always match how cars are sold, so each car tries a
 * short list of titles, most specific first.
 */
const TITLES: Record<string, string[]> = {
  'Toyota RAV4 Hybrid': ['Toyota RAV4 (XA50)', 'Toyota RAV4'],
  'Honda CR-V Hybrid': ['Honda CR-V (sixth generation)', 'Honda CR-V'],
  'Toyota Highlander Hybrid': ['Toyota Highlander (XU70)', 'Toyota Highlander'],
  'Toyota Camry': ['Toyota Camry (XV80)', 'Toyota Camry'],
  'Honda Civic': ['Honda Civic (eleventh generation)', 'Honda Civic'],
  'Ford F-150': ['Ford F-Series (fourteenth generation)', 'Ford F-Series'],
  'Ram 1500': ['Ram pickup'],
  'Chevrolet Silverado 1500': ['Chevrolet Silverado'],
  'Jeep Wrangler': ['Jeep Wrangler (JL)', 'Jeep Wrangler'],
  'Ford Bronco': ['Ford Bronco (sixth generation)', 'Ford Bronco'],
  'Tesla Model Y L': ['Tesla Model Y'],
  'Genesis Electrified GV70': ['Genesis GV70'],
  'Kia Niro EV': ['Kia Niro'],
  'Hyundai Kona Electric': ['Hyundai Kona'],
  'Toyota bZ': ['Toyota bZ4X'],
  'Porsche Macan Electric': ['Porsche Macan Electric', 'Porsche Macan'],
  'Nissan Leaf': ['Nissan Leaf (third generation)', 'Nissan Leaf'],
  'Chevrolet Bolt': ['Chevrolet Bolt'],
}

export function titlesFor(c: CarSpec): string[] {
  const name = `${c.make} ${c.model}`
  return [...(TITLES[name] ?? []), name]
}

export interface CarSummary {
  title: string
  description?: string
  extract?: string
  /** Photo URLs to try in order, sharpest first. */
  images: string[]
  page: string
}

/**
 * Wikimedia only serves thumbnails at its standard widths (others get HTTP
 * 429), and never wider than the original; so offer a few standard sizes,
 * then the API's own thumbnail and the original as last resorts.
 */
const STANDARD_WIDTHS = [960, 500, 330]

export function photoCandidates(thumb?: string, original?: string): string[] {
  const out: string[] = []
  if (thumb && /\/\d+px-/.test(thumb)) for (const w of STANDARD_WIDTHS) out.push(thumb.replace(/\/\d+px-/, `/${w}px-`))
  if (thumb) out.push(thumb)
  if (original) out.push(original)
  return [...new Set(out)]
}

const cache = new Map<string, Promise<CarSummary | null>>()

async function fetchTitle(title: string): Promise<CarSummary | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) return null
  const d = (await res.json()) as {
    type?: string
    title: string
    description?: string
    extract?: string
    thumbnail?: { source: string }
    originalimage?: { source: string }
    content_urls?: { desktop?: { page?: string } }
  }
  // Disambiguation pages list several cars; no use here.
  if (d.type && d.type !== 'standard') return null
  return {
    title: d.title,
    description: d.description,
    extract: d.extract,
    images: photoCandidates(d.thumbnail?.source, d.originalimage?.source),
    page: d.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  }
}

/** The first title with a photo, or the first that exists at all; null offline or when nothing matches. */
export function carSummary(c: CarSpec): Promise<CarSummary | null> {
  const key = `${c.make} ${c.model}`
  let p = cache.get(key)
  if (!p) {
    p = (async () => {
      let fallback: CarSummary | null = null
      for (const t of titlesFor(c)) {
        try {
          const s = await fetchTitle(t)
          if (s?.images.length) return s
          fallback ??= s
        } catch {
          // Offline or blocked: try the next title, then give up quietly.
        }
      }
      return fallback
    })()
    cache.set(key, p)
  }
  return p
}
