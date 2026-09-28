import type { CarSpec } from './types'

/**
 * Car photos and one-line summaries from Wikipedia's Action API, which
 * serves anonymous cross-site requests (`origin=*`) and freely licensed
 * Commons images. (The older REST v1 summary endpoint is being retired and
 * stopped answering.) Wikipedia titles don't always match how cars are sold,
 * so each car tries a short list of titles, most specific first, all in one
 * request.
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

/** A summary, or null when Wikipedia answered but had nothing; 'unreachable' when it didn't answer. */
export type SummaryResult = CarSummary | null | 'unreachable'

const cache = new Map<string, Promise<SummaryResult>>()

interface ApiPage {
  title: string
  missing?: boolean
  description?: string
  extract?: string
  thumbnail?: { source: string }
  original?: { source: string }
}

interface ApiResponse {
  query?: {
    normalized?: { from: string; to: string }[]
    redirects?: { from: string; to: string }[]
    pages?: ApiPage[]
  }
}

const pageUrl = (title: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`

/** Pick the best page from an Action API answer: the first candidate title that has a photo, else the first that exists. */
export function pickSummary(titles: string[], data: ApiResponse): CarSummary | null {
  const q = data.query
  if (!q?.pages) return null
  const follow = (t: string) => {
    let out = t
    for (const list of [q.normalized ?? [], q.redirects ?? []]) out = list.find((x) => x.from === out)?.to ?? out
    return out
  }
  const found = titles
    .map((t) => q.pages!.find((p) => p.title === follow(t) && !p.missing))
    .filter((p): p is ApiPage => !!p)
    .map(
      (p): CarSummary => ({
        title: p.title,
        description: p.description,
        extract: p.extract,
        images: photoCandidates(p.thumbnail?.source, p.original?.source),
        page: pageUrl(p.title),
      }),
    )
  return found.find((s) => s.images.length > 0) ?? found[0] ?? null
}

export function summaryUrl(titles: string[]): string {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    redirects: '1',
    prop: 'pageimages|description|extracts',
    piprop: 'thumbnail|original',
    pithumbsize: '960',
    exintro: '1',
    explaintext: '1',
    exsentences: '3',
    titles: titles.join('|'),
  })
  return `https://en.wikipedia.org/w/api.php?${params}`
}

export function carSummary(c: CarSpec): Promise<SummaryResult> {
  const key = `${c.make} ${c.model}`
  let p = cache.get(key)
  if (!p) {
    const titles = titlesFor(c)
    p = fetch(summaryUrl(titles))
      .then((res) => (res.ok ? (res.json() as Promise<ApiResponse>) : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => pickSummary(titles, data))
      .catch((): SummaryResult => {
        // Don't remember a failure; the next open can try again.
        cache.delete(key)
        return 'unreachable'
      })
    cache.set(key, p)
  }
  return p
}
