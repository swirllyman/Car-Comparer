import { inches } from '../geometry/units'
import type { BodyType, CarSpec } from './types'

/**
 * The wider catalogue: popular US models, one representative trim each,
 * from published spec summaries (inches). Mirror widths are rarely listed, so
 * most are left to the app's estimate and flagged as such. Rows are
 * [year, make, model, trim, body, length, width (body), height, wheelbase,
 * note?, mirrors-out width?].
 */
type Row = [number, string, string, string, BodyType, number, number, number, number, string?, number?]

const ROWS: Row[] = [
  // Compact SUVs
  [2025, 'Mazda', 'CX-5', '', 'suv', 180.1, 72.6, 65.4, 106.2],
  [2025, 'Mazda', 'CX-50', '', 'suv', 185.8, 72.9, 65.8, 110.8, '', 80.8],
  [2025, 'Hyundai', 'Tucson', '', 'suv', 182.7, 73.4, 66.3, 108.5],
  [2025, 'Kia', 'Sportage', '', 'suv', 183.5, 73.4, 66.3, 108.5, 'height 65.4–66.3 in by trim'],
  [2025, 'Subaru', 'Forester', '', 'suv', 183.3, 72.0, 68.1, 105.1],
  [2025, 'Subaru', 'Crosstrek', '', 'suv', 176.4, 71.7, 63.6, 105.1],
  [2025, 'Nissan', 'Rogue', '', 'suv', 183.0, 72.4, 66.5, 106.5],
  [2025, 'Chevrolet', 'Equinox', '', 'suv', 183.2, 74.9, 65.6, 107.5],
  [2025, 'Ford', 'Escape', '', 'suv', 181.2, 74.1, 66.1, 106.7],
  [2025, 'Volkswagen', 'Tiguan', '', 'suv', 184.4, 73.0, 66.5, 109.9],
  [2025, 'Toyota', 'Corolla Cross', '', 'suv', 176.8, 71.9, 63.8, 103.9],
  // Mid-size and three-row SUVs
  [2025, 'Ford', 'Explorer', '', 'suv', 198.8, 78.9, 69.9, 119.1, 'height approximate'],
  [2025, 'Honda', 'Pilot', 'Touring', 'suv', 199.9, 78.5, 71.0, 113.8],
  [2025, 'Chevrolet', 'Traverse', '', 'suv', 204.5, 79.6, 69.6, 121.0],
  [2025, 'Hyundai', 'Palisade', '', 'suv', 196.1, 77.8, 68.9, 114.2],
  [2025, 'Hyundai', 'Santa Fe', '', 'suv', 190.2, 74.8, 67.7, 110.8],
  [2025, 'Kia', 'Sorento', '', 'suv', 189.0, 74.8, 66.7, 110.8],
  [2025, 'Mazda', 'CX-90', '', 'suv', 201.6, 77.6, 68.2, 122.8],
  [2025, 'Subaru', 'Ascent', '', 'suv', 196.8, 76.0, 71.6, 113.8],
  [2025, 'Jeep', 'Grand Cherokee', '', 'suv', 193.5, 77.5, 70.8, 116.7],
  [2025, 'Toyota', '4Runner', 'SR5', 'suv', 194.9, 77.9, 72.6, 112.2, 'width and height vary by trim'],
  [2025, 'Volkswagen', 'Atlas', '', 'suv', 200.7, 78.3, 70.4, 117.3],
  [2025, 'Lexus', 'RX', '', 'suv', 192.5, 75.6, 67.3, 112.2],
  [2025, 'Jeep', 'Wrangler', 'Unlimited 4-door', 'suv', 188.4, 73.9, 70.9, 118.4],
  [2025, 'Ford', 'Bronco', '4-door', 'suv', 189.4, 75.9, 73.0, 116.1, 'width is with mirrors folded'],
  // Full-size SUVs
  [2025, 'Chevrolet', 'Tahoe', '', 'suv', 211.3, 81.0, 75.8, 120.9],
  [2025, 'Chevrolet', 'Suburban', '', 'suv', 226.3, 81.0, 76.6, 134.1],
  [2025, 'Ford', 'Expedition', '', 'suv', 209.9, 80.0, 78.1, 122.5],
  // Electric
  [2025, 'Tesla', 'Model 3', '', 'sedan', 185.8, 72.8, 56.7, 113.2],
  [2025, 'Tesla', 'Model X', '', 'suv', 198.3, 78.7, 66.3, 116.7],
  [2025, 'Tesla', 'Cybertruck', '', 'truck', 223.7, 80.0, 70.7, 143.1],
  [2025, 'Hyundai', 'Ioniq 5', '', 'hatchback', 183.3, 74.4, 63.0, 118.1],
  [2025, 'Hyundai', 'Ioniq 9', '', 'suv', 199.2, 78.0, 70.5, 123.2],
  [2025, 'Kia', 'EV6', '', 'hatchback', 184.3, 74.0, 61.0, 114.2],
  [2025, 'Kia', 'EV9', '', 'suv', 197.2, 78.0, 69.1, 122.0],
  [2025, 'Ford', 'Mustang Mach-E', '', 'suv', 186.0, 74.0, 63.3, 117.0],
  [2025, 'Chevrolet', 'Equinox EV', '', 'suv', 190.6, 76.9, 64.8, 116.3],
  [2025, 'Rivian', 'R1S', '', 'suv', 200.8, 81.8, 77.3, 121.1],
  // Cars
  [2025, 'Toyota', 'Camry', '', 'sedan', 193.5, 72.4, 56.9, 111.2],
  [2025, 'Toyota', 'Corolla', '', 'sedan', 182.5, 70.1, 56.5, 106.3],
  [2025, 'Toyota', 'Prius', '', 'hatchback', 181.1, 70.2, 55.9, 108.3],
  [2025, 'Honda', 'Accord', '', 'sedan', 195.7, 73.3, 57.1, 111.4],
  [2025, 'Honda', 'Civic', 'Sedan', 'sedan', 184.0, 70.9, 55.7, 107.7],
  // Minivans
  [2025, 'Honda', 'Odyssey', '', 'minivan', 205.2, 78.5, 69.6, 118.1],
  [2025, 'Chrysler', 'Pacifica', '', 'minivan', 204.3, 79.6, 70.7, 121.6, 'AWD height; FWD is 69.9 in'],
  [2025, 'Kia', 'Carnival', '', 'minivan', 203.0, 78.5, 69.9, 121.7, 'height with roof rails'],
  // Trucks
  [2025, 'Toyota', 'Tacoma', 'Double Cab 5 ft bed', 'truck', 213.0, 76.9, 73.8, 131.9],
  [2025, 'Toyota', 'Tundra', 'CrewMax 5.5 ft bed', 'truck', 233.6, 80.2, 78.0, 145.7, 'width 79.9–81.6 and height 75.8–78.0 in by trim'],
  [2025, 'Chevrolet', 'Silverado 1500', 'Crew Cab short box', 'truck', 231.8, 81.2, 75.8, 147.4],
  [2025, 'Ram', '1500', 'Crew Cab 5 ft 7 in box', 'truck', 232.9, 82.1, 77.6, 144.5],
  [2025, 'Honda', 'Ridgeline', '', 'truck', 210.2, 78.6, 70.8, 125.2],
  [2025, 'Ford', 'Maverick', '', 'truck', 199.8, 72.6, 68.8, 121.1],
]

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const CATALOG: CarSpec[] = ROWS.map(([year, make, model, trim, bodyType, l, w, h, wb, note, mirrors]) => ({
  id: slug(`${make} ${model} ${year} ${trim}`),
  year,
  make,
  model,
  trim,
  bodyType,
  length: inches(l),
  widthBody: inches(w),
  widthMirrors: mirrors === undefined ? undefined : inches(mirrors),
  height: inches(h),
  wheelbase: inches(wb),
  source: `${year} ${make} ${model} spec summaries${note ? ` (${note})` : ''}`,
}))
