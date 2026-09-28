import type { Garage, Mm, Obstacle, ResolvedCar } from '../data/types'
import { MIRROR_DEPTH, mirrorY } from './shapes'
import { inches } from './units'

/**
 * Where a car sits in the garage. x from the left wall, y from the back wall;
 * `topY` is the bumper nearest the back wall — the front one when parked nose
 * in, the rear one when backed in.
 */
export interface Parking {
  centerX: Mm
  topY: Mm
  reversed: boolean
}

/** Where the current car is, from the gaps the user measured. */
export function currentParking(garage: Garage, car: ResolvedCar): Parking {
  return { centerX: garage.parkedLeftGap + car.widthBody / 2, topY: garage.parkedFrontGap, reversed: !!garage.backedIn }
}

/**
 * A point in car coordinates (x across with the driver's side negative, y back
 * from the front bumper) placed in the garage. Backing in turns the car
 * round, so its driver's side ends up on the right-hand wall.
 */
export function toGarage(car: ResolvedCar, park: Parking, x: Mm, y: Mm): [Mm, Mm] {
  return park.reversed ? [park.centerX - x, park.topY + car.length - y] : [park.centerX + x, park.topY + y]
}

/** The span along the garage covered by a stretch of the car measured back from its front bumper. */
function span(car: ResolvedCar, park: Parking, fromFront: Mm, length: Mm): { y0: Mm; y1: Mm } {
  const a = toGarage(car, park, 0, fromFront)[1]
  const b = toGarage(car, park, 0, fromFront + length)[1]
  return { y0: Math.min(a, b), y1: Math.max(a, b) }
}

/** Where the mirrors are along the garage. */
export const mirrorBand = (car: ResolvedCar, park: Parking) => span(car, park, mirrorY(car), MIRROR_DEPTH)

export interface Clearance {
  value: Mm
  /** What the car gets closest to on this side. */
  against: string
}

export interface Fit {
  left: Clearance
  right: Clearance
  front: Clearance
  /** To the closed garage door. Negative means the door won't close. */
  rear: Clearance
  /** Space beside the driver's (left) door, body to the nearest thing. */
  driverDoor: Clearance
  passengerDoor: Clearance
  /** Per side, driving through the middle of the door opening with mirrors out. */
  doorwayLeft: Mm
  doorwayRight: Mm
  doorwayTop: Mm
  /** Room to spare in total, regardless of where the car is parked. */
  spareLength: Mm
  spareWidth: Mm
  fits: boolean
}

interface Box {
  x0: Mm
  x1: Mm
  y0: Mm
  y1: Mm
}

const overlaps = (a0: Mm, a1: Mm, b0: Mm, b1: Mm) => a0 < b1 && b0 < a1

/**
 * An obstacle is "ahead" of the car when it starts before the front bumper
 * and sits in the car's path; anything else it could touch is beside it. A
 * shelf running down the side wall past the bumper is therefore beside.
 */
const isAhead = (o: Obstacle, body: Box) => o.y < body.y0 && overlaps(body.x0, body.x1, o.x, o.x + o.w)

function lateral(garage: Garage, body: Box, band: Box, side: 'left' | 'right'): Clearance {
  let best: Clearance =
    side === 'left'
      ? { value: band.x0, against: 'left wall' }
      : { value: garage.width - band.x1, against: 'right wall' }
  for (const o of garage.obstacles) {
    if (!overlaps(band.y0, band.y1, o.y, o.y + o.d) || isAhead(o, body)) continue
    const gap = side === 'left' ? band.x0 - (o.x + o.w) : o.x - band.x1
    // Ignore things on the far side of the car, but keep anything that
    // overlaps it (a negative gap is a collision the user must see).
    const onThisSide = side === 'left' ? o.x + o.w / 2 < (band.x0 + band.x1) / 2 : o.x + o.w / 2 > (band.x0 + band.x1) / 2
    if (onThisSide && gap < best.value) best = { value: gap, against: o.label }
  }
  return best
}

/** Front-door band: the first 42 in behind the mirrors. */
const doorBand = (car: ResolvedCar, park: Parking) => span(car, park, mirrorY(car), inches(42))

export function checkFit(garage: Garage, car: ResolvedCar, park: Parking): Fit {
  const body: Box = {
    x0: park.centerX - car.widthBody / 2,
    x1: park.centerX + car.widthBody / 2,
    y0: park.topY,
    y1: park.topY + car.length,
  }
  const mirrors: Box = {
    x0: park.centerX - car.widthMirrors / 2,
    x1: park.centerX + car.widthMirrors / 2,
    ...mirrorBand(car, park),
  }

  const tighter = (a: Clearance, b: Clearance, bLabel: string): Clearance =>
    b.value < a.value ? { value: b.value, against: `${b.against} (${bLabel})` } : a
  const left = tighter(lateral(garage, body, body, 'left'), lateral(garage, body, mirrors, 'left'), 'at mirror')
  const right = tighter(lateral(garage, body, body, 'right'), lateral(garage, body, mirrors, 'right'), 'at mirror')

  let front: Clearance = { value: body.y0, against: 'back wall' }
  for (const o of garage.obstacles) {
    if (!isAhead(o, body)) continue
    const gap = body.y0 - (o.y + o.d)
    if (gap < front.value) front = { value: gap, against: o.label }
  }
  const rear: Clearance = { value: garage.depth - body.y1, against: 'garage door' }

  const band = doorBand(car, park)
  const driverSide = park.reversed ? 'right' : 'left'
  const driverDoor = lateral(garage, body, { ...body, ...band }, driverSide)
  const passengerDoor = lateral(garage, body, { ...body, ...band }, driverSide === 'left' ? 'right' : 'left')

  // You drive through the middle of the door and straighten up inside, so the
  // doorway check is the car centred in the opening, not on its parked line.
  const doorwayLeft = (garage.doorWidth - car.widthMirrors) / 2
  const doorwayRight = doorwayLeft
  const doorwayTop = garage.doorHeight - car.height

  const fits = Math.min(left.value, right.value, front.value, rear.value, doorwayLeft, doorwayRight, doorwayTop) >= 0

  return {
    left,
    right,
    front,
    rear,
    driverDoor,
    passengerDoor,
    doorwayLeft,
    doorwayRight,
    doorwayTop,
    spareLength: garage.depth - car.length,
    spareWidth: garage.width - car.widthMirrors,
    fits,
  }
}

/** Traffic-light status for a clearance: under three inches of room is "tight". */
export function clearanceLevel(mm: Mm, comfortable: Mm = inches(3)): 'bad' | 'tight' | 'ok' {
  if (mm < 0) return 'bad'
  if (mm < comfortable) return 'tight'
  return 'ok'
}

/** Getting out of a car wants roughly two feet beside the door. */
export const DOOR_COMFORT: Mm = inches(24)
