import { inches } from '../geometry/units'
import type { BodyType, CarSpec, ChargePort } from './types'

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

/**
 * Electric cars, with the charge port as a code: side L(eft, driver) / R(ight)
 * / C(entre nose) + end F(ront) / R(ear), several joined by "/", a trailing
 * "~" when the location came from a single or indirect source (e.g. a sister
 * model), and "" when unknown. Rows are
 * [year, make, model, trim, body, length, width (body), height, wheelbase,
 * port, note?, mirrors-out width?].
 */
type EvRow = [number, string, string, string, BodyType, number, number, number, number, string, string?, number?]

const EV_ROWS: EvRow[] = [
  // Tesla — every model charges at the left rear, by the tail light.
  [2025, 'Tesla', 'Model 3', '', 'sedan', 185.8, 72.8, 56.7, 113.2, 'LR'],
  [2026, 'Tesla', 'Model Y L', '6-seat', 'suv', 196.1, 75.6, 65.7, 119.7, 'LR', 'mirrors assumed same as Model Y', 83.8],
  [2025, 'Tesla', 'Model S', '', 'sedan', 194.1, 76.6, 56.4, 115.4, 'LR'],
  [2025, 'Tesla', 'Model X', '', 'suv', 198.3, 78.7, 66.3, 116.7, 'LR'],
  [2025, 'Tesla', 'Cybertruck', '', 'truck', 223.7, 80.0, 70.7, 143.1, 'LR'],
  // Hyundai, Kia, Genesis
  [2025, 'Hyundai', 'Ioniq 5', '', 'hatchback', 183.3, 74.4, 63.0, 118.1, 'RR'],
  [2025, 'Hyundai', 'Ioniq 6', '', 'sedan', 191.1, 74.0, 58.9, 116.1, 'RR'],
  [2025, 'Hyundai', 'Ioniq 9', '', 'suv', 199.2, 78.0, 70.5, 123.2, 'RR'],
  [2025, 'Hyundai', 'Kona Electric', '', 'suv', 172.6, 71.9, 62.2, 104.7, 'CF', 'port in the nose; wheelbase approximate'],
  [2025, 'Kia', 'EV6', '', 'hatchback', 184.3, 74.0, 61.0, 114.2, 'LR', 'US-built 2025+; earlier cars charge at the right rear'],
  [2025, 'Kia', 'EV9', '', 'suv', 197.2, 78.0, 69.1, 122.0, 'LR~', 'some model years charge at the right rear'],
  [2025, 'Kia', 'Niro EV', '', 'suv', 174.0, 71.9, 61.8, 107.1, 'CF', 'port in the nose; wheelbase approximate'],
  [2025, 'Genesis', 'GV60', '', 'suv', 178.9, 74.4, 62.2, 114.2, 'RR'],
  [2025, 'Genesis', 'Electrified GV70', '', 'suv', 185.6, 75.2, 64.2, 113.2, 'CF~', 'port behind the grille'],
  // Ford
  [2025, 'Ford', 'Mustang Mach-E', '', 'suv', 186.0, 74.0, 63.3, 117.0, 'LF'],
  [2025, 'Ford', 'F-150 Lightning', 'SuperCrew', 'truck', 232.7, 80.0, 78.5, 145.5, 'LF'],
  // GM
  [2025, 'Chevrolet', 'Equinox EV', '', 'suv', 190.6, 76.9, 64.8, 116.3, 'LF'],
  [2025, 'Chevrolet', 'Blazer EV', '', 'suv', 192.2, 78.0, 65.0, 121.8, 'LF~'],
  [2025, 'Chevrolet', 'Silverado EV', '', 'truck', 233.1, 81.6, 78.0, 145.7, 'LF~', 'width 81.6–83.8 in by trim'],
  [2027, 'Chevrolet', 'Bolt', '', 'hatchback', 169.6, 69.7, 63.9, 105.3, 'LF'],
  [2025, 'GMC', 'Sierra EV', '', 'truck', 233.4, 83.8, 78.7, 146.0, 'LF~'],
  [2025, 'GMC', 'Hummer EV', 'SUV', 'suv', 196.8, 86.5, 77.8, 126.7, ''],
  [2025, 'GMC', 'Hummer EV', 'Pickup', 'truck', 216.8, 86.7, 79.1, 135.6, ''],
  [2025, 'Cadillac', 'Lyriq', '', 'suv', 196.7, 77.8, 63.9, 121.8, 'LF~'],
  [2025, 'Cadillac', 'Optiq', '', 'suv', 189.8, 75.3, 64.6, 116.3, 'LF'],
  [2026, 'Cadillac', 'Vistiq', '', 'suv', 205.6, 79.8, 71.2, 121.8, 'LF~'],
  [2025, 'Cadillac', 'Escalade IQ', '', 'suv', 224.3, 85.3, 76.1, 136.2, ''],
  [2025, 'Honda', 'Prologue', '', 'suv', 192.0, 78.3, 64.7, 121.8, 'LF~'],
  [2025, 'Acura', 'ZDX', '', 'suv', 197.7, 77.0, 64.4, 121.8, 'LF~'],
  // Japanese brands
  [2025, 'Nissan', 'Ariya', '', 'suv', 180.9, 72.8, 65.6, 109.3, 'LF~'],
  [2026, 'Nissan', 'Leaf', '', 'hatchback', 173.4, 71.3, 61.0, 105.9, 'LF/RF', 'J1772 (AC) left front, NACS right front'],
  [2026, 'Toyota', 'bZ', '', 'suv', 184.6, 73.2, 65.0, 112.2, 'LF'],
  [2026, 'Subaru', 'Solterra', '', 'suv', 184.6, 73.2, 65.0, 112.2, 'LF'],
  [2025, 'Lexus', 'RZ', '', 'suv', 189.2, 74.6, 64.4, 112.2, 'LF~'],
  // German brands
  [2025, 'Volkswagen', 'ID.4', '', 'suv', 178.7, 72.2, 63.1, 108.1, 'RR'],
  [2025, 'Volkswagen', 'ID. Buzz', 'LWB', 'minivan', 195.4, 78.1, 76.3, 127.5, 'RR~'],
  [2025, 'Audi', 'Q4 e-tron', '', 'suv', 180.6, 73.4, 64.3, 108.8, 'LR~'],
  [2025, 'Audi', 'Q6 e-tron', '', 'suv', 187.8, 76.3, 64.9, 114.1, ''],
  [2025, 'BMW', 'iX', '', 'suv', 195.0, 77.4, 66.8, 118.1, 'RR~'],
  [2025, 'BMW', 'i4', 'Gran Coupe', 'sedan', 188.4, 72.9, 57.0, 112.4, 'RR~'],
  [2025, 'BMW', 'i5', '', 'sedan', 197.3, 74.1, 58.7, 116.8, 'RR~'],
  [2025, 'Mercedes-Benz', 'EQE SUV', '', 'suv', 191.5, 76.4, 66.1, 119.3, 'RR'],
  [2025, 'Mercedes-Benz', 'EQS SUV', '', 'suv', 201.8, 77.1, 67.6, 126.4, 'RR~'],
  [2025, 'Mercedes-Benz', 'EQB', '', 'suv', 184.0, 72.0, 66.0, 111.0, 'RR~'],
  [2025, 'Porsche', 'Taycan', '', 'sedan', 195.4, 77.5, 54.3, 114.2, 'LF', 'width is with mirrors folded'],
  [2025, 'Porsche', 'Macan Electric', '', 'suv', 188.3, 75.7, 63.8, 113.9, '', 'charge flaps on both sides; wheelbase approximate', 84.6],
  // Volvo and Polestar
  [2025, 'Polestar', '2', '', 'hatchback', 181.3, 73.2, 58.1, 107.7, 'LR'],
  [2025, 'Polestar', '3', '', 'suv', 192.9, 76.2, 63.5, 117.5, 'RR'],
  [2025, 'Polestar', '4', '', 'suv', 190.5, 79.1, 60.8, 118.1, 'RR'],
  [2025, 'Volvo', 'EX30', '', 'suv', 166.7, 72.3, 61.0, 104.3, 'LR~'],
  [2025, 'Volvo', 'EX40', '', 'suv', 174.8, 73.3, 65.0, 106.4, 'LR'],
  [2025, 'Volvo', 'EX90', '', 'suv', 198.3, 77.3, 68.8, 117.5, ''],
  // EV startups and others
  [2025, 'Rivian', 'R1S', '', 'suv', 200.8, 81.8, 77.3, 121.1, 'LF', 'width is with mirrors folded'],
  [2025, 'Rivian', 'R1T', '', 'truck', 217.1, 81.8, 75.7, 135.9, 'LF', 'width is with mirrors folded'],
  [2026, 'Rivian', 'R2', '', 'suv', 185.6, 75.0, 67.0, 115.6, 'LR'],
  [2025, 'Lucid', 'Air', '', 'sedan', 195.9, 76.3, 55.5, 116.5, 'LF'],
  [2025, 'Lucid', 'Gravity', '', 'suv', 198.0, 78.7, 65.4, 119.7, 'LR'],
  [2025, 'Jeep', 'Wagoneer S', '', 'suv', 192.4, 74.8, 64.8, 113.0, ''],
  [2025, 'Dodge', 'Charger Daytona', '', 'sedan', 206.6, 79.8, 59.0, 121.0, ''],
]

const SIDE: Record<string, ChargePort['side']> = { L: 'left', R: 'right', C: 'center' }

/** "LF/RF~" → two ports, unconfirmed. Exported for tests. */
export function parsePorts(code: string): { ports?: ChargePort[]; confirmed: boolean } {
  const confirmed = !code.endsWith('~')
  const body = code.replace('~', '')
  if (!body) return { confirmed }
  const ports = body.split('/').map((c) => ({ side: SIDE[c[0]], end: c[1] === 'F' ? 'front' : 'rear' }) as ChargePort)
  return { ports, confirmed }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const fromEv = ([year, make, model, trim, body, l, w, h, wb, port, note, mirrors]: EvRow): CarSpec => {
  const { ports, confirmed } = parsePorts(port)
  return {
    ...fromRow([year, make, model, trim, body, l, w, h, wb, note, mirrors]),
    ev: true,
    chargePorts: ports,
    portConfirmed: ports ? confirmed : undefined,
  }
}

function fromRow([year, make, model, trim, bodyType, l, w, h, wb, note, mirrors]: Row): CarSpec {
  return {
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
  }
}

export const CATALOG: CarSpec[] = [...ROWS.map(fromRow), ...EV_ROWS.map(fromEv)]
