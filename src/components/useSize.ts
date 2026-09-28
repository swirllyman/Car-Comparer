import { useLayoutEffect, useRef, useState } from 'react'

export interface Box {
  w: number
  h: number
}

/** Track an element's size in CSS pixels, so drawings can size their text to the screen. */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [box, setBox] = useState<Box>({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setBox((b) => (b.w === width && b.h === height ? b : { w: width, h: height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, box] as const
}

/**
 * The font size, in drawing units (mm), that renders at `px` on screen once
 * the drawing is scaled to fit `box`. The drawing is `contentW × contentH`
 * plus label room of `padW × padH` font-sizes; whichever axis binds sets the
 * scale. Falls back to 3% of the drawing when the box is too small to solve.
 */
export function fontFor(contentW: number, padW: number, contentH: number, padH: number, box: Box, px = 13): number {
  const fallback = Math.max(contentW, contentH) * 0.03
  if (box.w <= 0 || box.h <= 0) return fallback
  const byW = box.w > px * padW + 1 ? (px * contentW) / (box.w - px * padW) : 0
  const byH = box.h > px * padH + 1 ? (px * contentH) / (box.h - px * padH) : 0
  const fs = Math.max(byW, byH)
  return fs > 0 ? fs : fallback
}
