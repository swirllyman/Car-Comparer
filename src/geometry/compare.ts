import type { Anchor, Mm, ResolvedCar } from '../data/types'

export interface Placement {
  /** Longitudinal position of the front bumper (y grows toward the rear). */
  frontY: Mm
}

export interface Comparison {
  current: Placement
  candidate: Placement
  /**
   * How far the candidate sticks out past the current car on each side.
   * Positive = candidate reaches further; negative = it stops short.
   */
  front: Mm
  rear: Mm
  /** Per side, cars sharing a centreline. */
  side: Mm
  sideMirrors: Mm
  top: Mm
  length: Mm
  width: Mm
  widthMirrors: Mm
  height: Mm
  wheelbase: Mm
}

/**
 * Line the two cars up on the chosen anchor and measure the overhang on
 * every side. Both cars share a centreline and sit on the same ground.
 */
export function compareCars(current: ResolvedCar, candidate: ResolvedCar, anchor: Anchor): Comparison {
  let candidateFront: Mm
  switch (anchor) {
    case 'front':
      candidateFront = 0
      break
    case 'rear':
      candidateFront = current.length - candidate.length
      break
    case 'center':
      candidateFront = (current.length - candidate.length) / 2
      break
  }

  const width = candidate.widthBody - current.widthBody
  const widthMirrors = candidate.widthMirrors - current.widthMirrors
  return {
    current: { frontY: 0 },
    candidate: { frontY: candidateFront },
    front: -candidateFront,
    rear: candidateFront + candidate.length - current.length,
    side: width / 2,
    sideMirrors: widthMirrors / 2,
    top: candidate.height - current.height,
    length: candidate.length - current.length,
    width,
    widthMirrors,
    height: candidate.height - current.height,
    wheelbase: candidate.wheelbase - current.wheelbase,
  }
}
