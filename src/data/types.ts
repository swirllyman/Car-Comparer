/** Every length in the app is millimetres; units only change on display. */
export type Mm = number

export type BodyType = 'sedan' | 'hatchback' | 'wagon' | 'suv' | 'minivan' | 'truck'

/**
 * Where a charge port sits. Side is from the driver's seat (US: left is the
 * driver's side); "center" is a nose-mounted port. End is which axle it's by.
 */
export interface ChargePort {
  side: 'left' | 'right' | 'center'
  end: 'front' | 'rear'
  /** e.g. "AC only" when a car has two ports. */
  note?: string
}

export interface CarSpec {
  id: string
  year: number
  make: string
  model: string
  trim: string
  bodyType: BodyType
  length: Mm
  /** Body only, mirrors excluded — what most US spec sheets call "width". */
  widthBody: Mm
  /** Widest point with the mirrors out, as when driving. */
  widthMirrors?: Mm
  height: Mm
  wheelbase: Mm
  frontOverhang?: Mm
  groundClearance?: Mm
  /** Battery-electric. */
  ev?: boolean
  chargePorts?: ChargePort[]
  /** False when the port location came from a single or indirect source. */
  portConfirmed?: boolean
  /** Free-form secondary stats for the comparison table. */
  stats?: Record<string, string>
  /** Where the numbers came from, so a surprising answer can be checked. */
  source: string
  /** True for a car entered or edited by hand (e.g. tape-measured). */
  custom?: boolean
}

/** A spec with every optional dimension filled in, and a note of which were guessed. */
export interface ResolvedCar extends CarSpec {
  widthMirrors: Mm
  frontOverhang: Mm
  groundClearance: Mm
  estimated: ('widthMirrors' | 'frontOverhang' | 'groundClearance')[]
}

export interface Obstacle {
  id: string
  label: string
  /** Top-down rectangle: x from the left wall, y from the back (far) wall. */
  x: Mm
  y: Mm
  w: Mm
  d: Mm
}

export interface Garage {
  width: Mm
  depth: Mm
  doorWidth: Mm
  doorHeight: Mm
  /** Left edge of the door opening, measured from the left wall. */
  doorOffset: Mm
  /**
   * Where the current car sits, measured with it parked nose-in: from the left
   * wall to the left side of the body, and from the back wall to the front bumper.
   */
  parkedLeftGap: Mm
  parkedFrontGap: Mm
  obstacles: Obstacle[]
  /** Wall-mounted charger, if there is one. */
  charger?: Charger
}

export interface Charger {
  wall: 'left' | 'right' | 'back'
  /** Along the wall: from the back wall for side walls, from the left wall for the back wall. */
  along: Mm
  cable: Mm
}

export type Units = 'in' | 'ftin' | 'cm'
export type View = 'top' | 'side' | 'front' | '3d' | 'garage' | 'stats'
export type Anchor = 'front' | 'rear' | 'center'
