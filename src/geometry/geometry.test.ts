import { describe, expect, it } from 'vitest'
import type { CarSpec, Garage } from '../data/types'
import { compareCars } from './compare'
import { checkFit, currentParking } from './fit'
import { resolveCar } from './resolve'
import { feet, formatDelta, formatLength, inches } from './units'

const base: CarSpec = {
  id: 'a',
  year: 2020,
  make: 'Test',
  model: 'A',
  trim: '',
  bodyType: 'suv',
  length: inches(180),
  widthBody: inches(72),
  widthMirrors: inches(82),
  height: inches(66),
  wheelbase: inches(105),
  frontOverhang: inches(36),
  groundClearance: inches(8),
  source: 'test',
}
const bigger: CarSpec = { ...base, id: 'b', length: inches(190), widthBody: inches(76), widthMirrors: inches(86), height: inches(70) }

const garage: Garage = {
  width: feet(12),
  depth: feet(20),
  doorWidth: feet(9),
  doorHeight: feet(7),
  doorOffset: feet(1.5),
  parkedLeftGap: feet(3),
  parkedFrontGap: inches(24),
  obstacles: [],
}

const close = (mm: number, expectedIn: number) => expect(mm / 25.4).toBeCloseTo(expectedIn, 5)

describe('units', () => {
  it('formats lengths and deltas', () => {
    expect(formatLength(inches(180.9), 'in')).toBe('180.9 in')
    expect(formatLength(inches(180.9), 'ftin')).toBe('15′ 0.9″')
    expect(formatLength(inches(11.97), 'ftin')).toBe('1′ 0″')
    expect(formatLength(4595, 'cm')).toBe('459.5 cm')
    expect(formatDelta(inches(7.3), 'in')).toBe('+7.3 in')
    expect(formatDelta(-inches(1.2), 'in')).toBe('−1.2 in')
    expect(formatDelta(0.1, 'in')).toBe('same')
  })
})

describe('resolveCar', () => {
  it('estimates missing mirrors and says so', () => {
    const r = resolveCar({ ...base, widthMirrors: undefined })
    close(r.widthMirrors, 82)
    expect(r.estimated).toEqual(['widthMirrors'])
  })
})

describe('compareCars', () => {
  const a = resolveCar(base)
  const b = resolveCar(bigger)
  it('rear anchor puts all extra length at the front', () => {
    const c = compareCars(a, b, 'rear')
    close(c.front, 10)
    close(c.rear, 0)
    close(c.side, 2)
    close(c.sideMirrors, 2)
    close(c.top, 4)
  })
  it('front anchor puts all extra length at the rear', () => {
    const c = compareCars(a, b, 'front')
    close(c.front, 0)
    close(c.rear, 10)
  })
  it('center anchor splits it', () => {
    const c = compareCars(a, b, 'center')
    close(c.front, 5)
    close(c.rear, 5)
  })
})

describe('checkFit', () => {
  const a = resolveCar(base)
  it('measures every side from the parked position', () => {
    const f = checkFit(garage, a, currentParking(garage, a))
    // Body left at 36 in; mirrors stick out 5 in more.
    close(f.left.value, 31)
    expect(f.left.against).toContain('at mirror')
    close(f.right.value, 144 - 36 - 72 - 5)
    close(f.front.value, 24)
    close(f.rear.value, 240 - 24 - 180)
    close(f.driverDoor.value, 36)
    close(f.doorwayTop, 84 - 66)
    // Driven through the middle of a 108 in door with 82 in of mirrors.
    close(f.doorwayLeft, 13)
    close(f.doorwayRight, 13)
    expect(f.fits).toBe(true)
  })
  it('flags a car that stops the door closing', () => {
    const long = resolveCar({ ...base, length: inches(230) })
    const f = checkFit(garage, long, currentParking(garage, long))
    expect(f.rear.value).toBeLessThan(0)
    expect(f.fits).toBe(false)
    close(f.spareLength, 10)
  })
  it('counts obstacles beside and in front of the car', () => {
    const g: Garage = {
      ...garage,
      obstacles: [
        { id: '1', label: 'Workbench', x: 0, y: 0, w: inches(48), d: inches(20) },
        { id: '2', label: 'Step', x: inches(90), y: inches(60), w: inches(54), d: inches(40) },
      ],
    }
    const f = checkFit(g, a, currentParking(g, a))
    // Workbench reaches 48 in off the left wall, into the car's path.
    close(f.front.value, 24 - 20)
    expect(f.front.against).toBe('Workbench')
    // Step starts at x=90; body right edge at 108 → overlapping by 18 in.
    close(f.right.value, -18 - 5)
    expect(f.fits).toBe(false)
  })
  it('treats a shelf running down the side wall as beside the car, not ahead', () => {
    const g: Garage = { ...garage, obstacles: [{ id: 's', label: 'Shelf', x: 0, y: 0, w: inches(18), d: inches(200) }] }
    const f = checkFit(g, a, currentParking(g, a))
    close(f.front.value, 24)
    close(f.left.value, 31 - 18)
    expect(f.left.against).toContain('Shelf')
  })
  it('turns everything round when backed in', () => {
    const g: Garage = { ...garage, backedIn: true, parkedLeftGap: inches(20) }
    const f = checkFit(g, a, currentParking(g, a))
    // Driver's side now faces the right wall: 144 − 20 − 72 = 52 in of room.
    close(f.driverDoor.value, 52)
    close(f.passengerDoor.value, 20)
    // Rear bumper 24 in from the back wall, so the same end clearances.
    close(f.front.value, 24)
    close(f.rear.value, 240 - 24 - 180)
  })
})
