import { describe, expect, it } from 'vitest'
import { parsePorts } from '../data/catalog'
import type { CarSpec, Garage } from '../data/types'
import { checkCable, portPoints, routeAround } from './charge'
import { currentParking } from './fit'
import { resolveCar } from './resolve'
import { feet, inches } from './units'

const car = resolveCar({
  id: 't',
  year: 2026,
  make: 'Test',
  model: 'EV',
  trim: '',
  bodyType: 'suv',
  length: inches(180),
  widthBody: inches(72),
  height: inches(64),
  wheelbase: inches(110),
  frontOverhang: inches(35),
  source: 'test',
  ev: true,
  chargePorts: [{ side: 'left', end: 'rear' }],
})

const garage: Garage = {
  width: feet(12),
  depth: feet(22),
  doorWidth: feet(9),
  doorHeight: feet(7),
  doorOffset: feet(1.5),
  parkedLeftGap: inches(36),
  parkedFrontGap: inches(24),
  obstacles: [],
}

describe('parsePorts', () => {
  it('reads side, end, several ports and confidence', () => {
    expect(parsePorts('LR')).toEqual({ ports: [{ side: 'left', end: 'rear' }], confirmed: true })
    expect(parsePorts('LF/RF~').ports).toHaveLength(2)
    expect(parsePorts('LF/RF~').confirmed).toBe(false)
    expect(parsePorts('CF').ports![0].side).toBe('center')
    expect(parsePorts('').ports).toBeUndefined()
  })
})

describe('routeAround', () => {
  const box = { x0: 100, y0: 100, x1: 200, y1: 300 }
  it('goes straight when nothing is in the way', () => {
    expect(routeAround([0, 0], [0, 400], box)!.length).toBeCloseTo(400)
  })
  it('bends around the car instead of through it', () => {
    const r = routeAround([150, 0], [150, 400], box, 0)!
    // Straight would be 400; around a 100-wide box it must be longer.
    expect(r.length).toBeGreaterThan(400)
    expect(r.path.length).toBeGreaterThan(2)
  })
})

describe('checkCable', () => {
  it('measures from a charger on the same side as the port', () => {
    const g = { ...garage, charger: { wall: 'left' as const, along: portPoints(car)[0].y + inches(24), cable: feet(24) } }
    const c = checkCable(g, car, currentParking(g, car))!
    // Port sits 36 in from the left wall at the same depth: 36 in + 60 mm step-out, plus allowance.
    expect(c.needed / 25.4).toBeCloseTo(36 - 60 / 25.4 + 24, 0)
  })
  it('needs much more cable when the charger is on the far side', () => {
    const near = { ...garage, charger: { wall: 'left' as const, along: feet(15), cable: feet(24) } }
    const far = { ...garage, charger: { wall: 'right' as const, along: feet(15), cable: feet(24) } }
    const a = checkCable(near, car, currentParking(near, car))!.needed
    const b = checkCable(far, car, currentParking(far, car))!.needed
    expect(b).toBeGreaterThan(a + inches(72))
  })
  it('is null without a charger or a port', () => {
    expect(checkCable(garage, car, currentParking(garage, car))).toBeNull()
    const gas: CarSpec = { ...car, chargePorts: undefined }
    const g = { ...garage, charger: { wall: 'left' as const, along: feet(10), cable: feet(24) } }
    expect(checkCable(g, resolveCar(gas), currentParking(g, car))).toBeNull()
  })
  it('finds a rear port by the garage door when backed in', () => {
    const g = { ...garage, backedIn: true, charger: { wall: 'left' as const, along: feet(15), cable: feet(24) } }
    const noseIn = { ...g, backedIn: false }
    const back = checkCable(g, car, currentParking(g, car))!
    const nose = checkCable(noseIn, car, currentParking(noseIn, car))!
    // Nose in, the left-rear port is on the charger's wall near 15 ft; backed in
    // it swaps to the right side and the far end, so it needs more cable.
    expect(back.needed).toBeGreaterThan(nose.needed)
  })
})
