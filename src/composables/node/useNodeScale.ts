// src/composables/node/useNodeScale.ts
import { NODE_SCALE } from '../../types/mindmap-constants'

/**
 * Эффективный масштаб узла с учётом сопротивления global-зуму.
 *
 * @param nodeScale — персональный scale узла (1 по умолчанию)
 * @param globalZoom — текущий zoom канваса
 *
 * Поведение:
 *  • nodeScale === 1 → effectiveScale === 1 (никакого сопротивления)
 *  • nodeScale > 1 + globalZoom < 1 (zoom-out) → effective > nodeScale
 *    (узел «упирается» и уменьшается меньше)
 *  • nodeScale > 1 + globalZoom > 1 (zoom-in) → effective < nodeScale
 *    (узел меньше увеличивается, выравниваясь с соседями)
 *
 * Focus-mode = globalZoom = 1.25, поэтому работает автоматически.
 */
export function computeEffectiveScale(
  nodeScale: number,
  globalZoom: number
): number {
  if (nodeScale === NODE_SCALE.DEFAULT || globalZoom <= 0) {
    return nodeScale
  }
  const resistance = 1 - NODE_SCALE.ZOOM_RESISTANCE * Math.log(globalZoom)
  return Math.pow(nodeScale, resistance)
}

/** Clamp в допустимый диапазон (без snap). Для live input. */
export function clampScale(value: number): number {
  return Math.min(NODE_SCALE.MAX, Math.max(NODE_SCALE.MIN, value))
}

/** Clamp + snap-to-1 в пределах порога. Для commit. */
export function normalizeScale(value: number): number {
  const clamped = clampScale(value)
  return Math.abs(clamped - NODE_SCALE.DEFAULT) < NODE_SCALE.SNAP_THRESHOLD
    ? NODE_SCALE.DEFAULT
    : clamped
}