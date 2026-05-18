// src/entities/node/model/useNodeDimensions.ts
//
// Единый расчёт полных размеров узла, включая картинку и заметки.
// Используется всеми layout-алгоритмами.

import type { MindMapNode } from '@entities/node'
import { NODE_CORE, NODE_IMAGE, NODE_NOTES, calcNotesHeight } from '@shared/config/node-dimensions'
import { NODE_SCALE } from '@entities/node/model/constants'

/**
 * Полные размеры узла на канвасе.
 *
 * Визуальная структура:
 *
 *         ┌─────────────┐
 *         │   IMAGE     │  ← imageHeight (если есть)
 *         └─────────────┘
 *               │
 *         ┌─────────────┐
 *         │  NODE CORE  │  ← coreWidth × coreHeight
 *         │  (текст)    │
 *         └─────────────┘
 *               │
 *         ┌─────────────┐
 *         │   NOTES     │  ← notesHeight (если есть)
 *         │  (превью)   │
 *         └─────────────┘
 */
export interface NodeDimensions {
  /** Ширина ядра (текстовая часть), с учётом scale */
  coreWidth: number
  /** Высота ядра (текстовая часть), с учётом scale */
  coreHeight: number
  /** Высота картинки (0 если нет) */
  imageHeight: number
  /** Высота заметок (0 если нет) */
  notesHeight: number
  /** Полная высота: image + margin + core + margin + notes */
  totalHeight: number
  /** Полная ширина: max(coreWidth, imageWidth, notesWidth) */
  totalWidth: number
}

/**
 * Рассчитать полные размеры узла.
 *
 * @param node  — узел дерева
 * @param depth — глубина (0 = root)
 * @param scale — масштаб узла (по умолчанию из node.scale или 1)
 */
export function getNodeDimensions(
  node: MindMapNode,
  depth: number,
  scale?: number,
): NodeDimensions {
  const s = scale ?? node.scale ?? NODE_SCALE.DEFAULT

  // ─── Ядро ───────────────────────────────────────
  const coreWidth = (depth === 0 ? NODE_CORE.ROOT_WIDTH : NODE_CORE.WIDTH) * s
  const coreHeight = (depth === 0 ? NODE_CORE.ROOT_HEIGHT : NODE_CORE.HEIGHT) * s

  // ─── Картинка ────────────────────────────────────
  const hasImage = node.imageId !== null
  const imageWidth = hasImage
    ? (node.imageWidth ?? NODE_IMAGE.DEFAULT_WIDTH) * s
    : 0
  const imageHeight = hasImage
    ? Math.round(imageWidth * NODE_IMAGE.ASPECT_RATIO)
    : 0

  // ─── Заметки ─────────────────────────────────────
  const rawNotesHeight = calcNotesHeight(node.notes)
  const notesHeight = rawNotesHeight > 0 ? Math.round(rawNotesHeight * s) : 0

  // ─── Итого ───────────────────────────────────────
  const totalHeight =
    (hasImage ? imageHeight + NODE_IMAGE.MARGIN : 0) +
    coreHeight +
    (rawNotesHeight > 0 ? NODE_NOTES.MARGIN + notesHeight : 0)

  const notesWidth = rawNotesHeight > 0 ? NODE_NOTES.PREVIEW_MAX_WIDTH * s : 0
  const totalWidth = Math.max(coreWidth, imageWidth, notesWidth)

  return {
    coreWidth,
    coreHeight,
    imageHeight,
    notesHeight,
    totalHeight,
    totalWidth,
  }
}

/**
 * Быстрый расчёт только высоты ядра (для обратной совместимости).
 * Эквивалент старой getNodeHeight() без заметок/картинок.
 */
export function getNodeCoreHeight(depth: number, scale: number = 1): number {
  return (depth === 0 ? NODE_CORE.ROOT_HEIGHT : NODE_CORE.HEIGHT) * scale
}

/**
 * Быстрый расчёт только ширины ядра.
 */
export function getNodeCoreWidth(depth: number, scale: number = 1): number {
  return (depth === 0 ? NODE_CORE.ROOT_WIDTH : NODE_CORE.WIDTH) * scale
}
