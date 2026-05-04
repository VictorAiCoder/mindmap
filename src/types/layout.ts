// src/types/layout.ts
import type { MindMapNode } from '@entities/node'

/**
 * Позиция узла на канвасе.
 * Вычисляется в useLayout.
 */
export interface LayoutPosition {
  id: string
  node: MindMapNode
  x: number
  y: number
  w: number
  h: number
  depth: number
  hasCustomPos: boolean
}

/**
 * Границы сцены — прямоугольник, охватывающий все узлы с padding.
 */
export interface LayoutBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export interface LayoutData {
  positions: LayoutPosition[]
  bounds: LayoutBounds
}

/**
 * Карта координат — используется при drag'е для узлов без customX/Y.
 */
export type PositionMap = Map<string, { x: number; y: number }>