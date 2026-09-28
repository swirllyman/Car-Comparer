import type { CarSpec, Power } from './types'

/**
 * Seats, powertrains and AWD availability per model (US market, the model
 * year in the catalogue), for filtering. Seats are [fewest, most] across the
 * seating options; power lists every powertrain offered under the name.
 */
interface Meta {
  seats: [number, number]
  power: Power[]
  /** False for the few models sold front-drive only. */
  awd?: boolean
}

const G: Power[] = ['gas']
const GH: Power[] = ['gas', 'hybrid']
const GHP: Power[] = ['gas', 'hybrid', 'phev']
const GP: Power[] = ['gas', 'phev']
const H: Power[] = ['hybrid']
const EV: Power[] = ['ev']

const s = (a: number, b = a): [number, number] => [a, b]

const META: Record<string, Meta> = {
  // Hand-checked cars
  'Toyota RAV4 Hybrid': { seats: s(5), power: H },
  'Honda CR-V Hybrid': { seats: s(5), power: H },
  'Subaru Outback': { seats: s(5), power: G },
  'Tesla Model Y': { seats: s(5), power: EV },
  'Toyota Highlander Hybrid': { seats: s(7, 8), power: H },
  'Kia Telluride': { seats: s(7, 8), power: G },
  'Toyota Grand Highlander': { seats: s(7, 8), power: GH },
  'Toyota Sienna': { seats: s(7, 8), power: H },
  'Ford F-150': { seats: s(5, 6), power: GH },
  // Compact SUVs
  'Mazda CX-5': { seats: s(5), power: G },
  'Mazda CX-50': { seats: s(5), power: GH },
  'Hyundai Tucson': { seats: s(5), power: GHP },
  'Kia Sportage': { seats: s(5), power: GHP },
  'Subaru Forester': { seats: s(5), power: GH },
  'Subaru Crosstrek': { seats: s(5), power: G },
  'Nissan Rogue': { seats: s(5), power: G },
  'Chevrolet Equinox': { seats: s(5), power: G },
  'Ford Escape': { seats: s(5), power: GH },
  'Volkswagen Tiguan': { seats: s(5), power: G },
  'Toyota Corolla Cross': { seats: s(5), power: GH },
  // Mid-size and three-row SUVs
  'Ford Explorer': { seats: s(6, 7), power: G },
  'Honda Pilot': { seats: s(7, 8), power: G },
  'Chevrolet Traverse': { seats: s(7, 8), power: G },
  'Hyundai Palisade': { seats: s(7, 8), power: G },
  'Hyundai Santa Fe': { seats: s(6, 7), power: GH },
  'Kia Sorento': { seats: s(6, 7), power: GHP },
  'Mazda CX-90': { seats: s(6, 8), power: GP },
  'Subaru Ascent': { seats: s(7, 8), power: G },
  'Jeep Grand Cherokee': { seats: s(5), power: GP },
  'Toyota 4Runner': { seats: s(5, 7), power: GH },
  'Volkswagen Atlas': { seats: s(6, 7), power: G },
  'Lexus RX': { seats: s(5), power: GHP },
  'Jeep Wrangler': { seats: s(5), power: GP },
  'Ford Bronco': { seats: s(5), power: G },
  'Chevrolet Tahoe': { seats: s(7, 9), power: G },
  'Chevrolet Suburban': { seats: s(7, 9), power: G },
  'Ford Expedition': { seats: s(7, 8), power: G },
  // Cars
  'Toyota Camry': { seats: s(5), power: H },
  'Toyota Corolla': { seats: s(5), power: GH },
  'Toyota Prius': { seats: s(5), power: ['hybrid', 'phev'] },
  'Honda Accord': { seats: s(5), power: GH, awd: false },
  'Honda Civic': { seats: s(5), power: GH, awd: false },
  // Minivans
  'Honda Odyssey': { seats: s(7, 8), power: G, awd: false },
  'Chrysler Pacifica': { seats: s(7, 8), power: GP },
  'Kia Carnival': { seats: s(7, 8), power: GH, awd: false },
  // Trucks
  'Toyota Tacoma': { seats: s(5), power: GH },
  'Toyota Tundra': { seats: s(5), power: GH },
  'Chevrolet Silverado 1500': { seats: s(5, 6), power: G },
  'Ram 1500': { seats: s(5, 6), power: G },
  'Honda Ridgeline': { seats: s(5), power: G },
  'Ford Maverick': { seats: s(5), power: GH },
  // Electric
  'Tesla Model 3': { seats: s(5), power: EV },
  'Tesla Model Y L': { seats: s(6), power: EV },
  'Tesla Model S': { seats: s(5), power: EV },
  'Tesla Model X': { seats: s(5, 7), power: EV },
  'Tesla Cybertruck': { seats: s(5), power: EV },
  'Hyundai Ioniq 5': { seats: s(5), power: EV },
  'Hyundai Ioniq 6': { seats: s(5), power: EV },
  'Hyundai Ioniq 9': { seats: s(6, 7), power: EV },
  'Hyundai Kona Electric': { seats: s(5), power: EV, awd: false },
  'Kia EV6': { seats: s(5), power: EV },
  'Kia EV9': { seats: s(6, 7), power: EV },
  'Kia Niro EV': { seats: s(5), power: EV, awd: false },
  'Genesis GV60': { seats: s(5), power: EV },
  'Genesis Electrified GV70': { seats: s(5), power: EV },
  'Ford Mustang Mach-E': { seats: s(5), power: EV },
  'Ford F-150 Lightning': { seats: s(5), power: EV },
  'Chevrolet Equinox EV': { seats: s(5), power: EV },
  'Chevrolet Blazer EV': { seats: s(5), power: EV },
  'Chevrolet Silverado EV': { seats: s(5), power: EV },
  'Chevrolet Bolt': { seats: s(5), power: EV, awd: false },
  'GMC Sierra EV': { seats: s(5), power: EV },
  'GMC Hummer EV': { seats: s(5), power: EV },
  'Cadillac Lyriq': { seats: s(5), power: EV },
  'Cadillac Optiq': { seats: s(5), power: EV },
  'Cadillac Vistiq': { seats: s(6, 7), power: EV },
  'Cadillac Escalade IQ': { seats: s(7), power: EV },
  'Honda Prologue': { seats: s(5), power: EV },
  'Acura ZDX': { seats: s(5), power: EV },
  'Nissan Ariya': { seats: s(5), power: EV },
  'Nissan Leaf': { seats: s(5), power: EV, awd: false },
  'Toyota bZ': { seats: s(5), power: EV },
  'Subaru Solterra': { seats: s(5), power: EV },
  'Lexus RZ': { seats: s(5), power: EV },
  'Volkswagen ID.4': { seats: s(5), power: EV },
  'Volkswagen ID. Buzz': { seats: s(6, 7), power: EV },
  'Audi Q4 e-tron': { seats: s(5), power: EV },
  'Audi Q6 e-tron': { seats: s(5), power: EV },
  'BMW iX': { seats: s(5), power: EV },
  'BMW i4': { seats: s(5), power: EV },
  'BMW i5': { seats: s(5), power: EV },
  'Mercedes-Benz EQE SUV': { seats: s(5), power: EV },
  'Mercedes-Benz EQS SUV': { seats: s(5, 7), power: EV },
  'Mercedes-Benz EQB': { seats: s(5, 7), power: EV },
  'Porsche Taycan': { seats: s(4, 5), power: EV },
  'Porsche Macan Electric': { seats: s(5), power: EV },
  'Polestar 2': { seats: s(5), power: EV },
  'Polestar 3': { seats: s(5), power: EV },
  'Polestar 4': { seats: s(5), power: EV },
  'Volvo EX30': { seats: s(5), power: EV },
  'Volvo EX40': { seats: s(5), power: EV },
  'Volvo EX90': { seats: s(6, 7), power: EV },
  'Rivian R1S': { seats: s(7), power: EV },
  'Rivian R1T': { seats: s(5), power: EV },
  'Rivian R2': { seats: s(5), power: EV },
  'Lucid Air': { seats: s(5), power: EV },
  'Lucid Gravity': { seats: s(5, 7), power: EV },
  'Jeep Wagoneer S': { seats: s(5), power: EV },
  'Dodge Charger Daytona': { seats: s(5), power: EV },
}

/** Fill in seats, powertrain and AWD where the car doesn't already say. */
export function withMeta(c: CarSpec): CarSpec {
  const m = META[`${c.make} ${c.model}`]
  if (!m) return c
  return { ...c, seats: c.seats ?? m.seats, power: c.power ?? m.power, awd: c.awd ?? m.awd ?? true }
}

/** Names with no entry, for a test that keeps the table complete. */
export const missingMeta = (cars: CarSpec[]) => cars.filter((c) => !META[`${c.make} ${c.model}`]).map((c) => `${c.make} ${c.model}`)
