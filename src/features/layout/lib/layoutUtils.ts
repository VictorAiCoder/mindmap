import type { MindMapNode } from '@entities/node'
import { getNodeDimensions } from '@entities/node/model/useNodeDimensions'
import { NODE_NOTES } from '@/shared/config/node-dimensions'

/**
 * Ширина ядра узла по глубине.
 * Корень (depth=0) шире, остальные — стандартной ширины.
 * Учитывает scale узла.
 */
export function getNodeWidth(node: MindMapNode, depth: number): number {
  return getNodeDimensions(node, depth).coreWidth
}

/**
 * Полная высота узла с учётом картинки, ядра и превью заметок.
 * Включает все margin'ы.
 */
export function getNodeHeight(node: MindMapNode, depth: number): number {
  return getNodeDimensions(node, depth).totalHeight
}

/**
 * Высота ядра узла (только текстовая часть, без картинки и заметок).
 */
export function getNodeCoreHeight(node: MindMapNode, depth: number): number {
  return getNodeDimensions(node, depth).coreHeight
}

/**
 * Высота поддерева (для горизонтальных раскладок).
 * Рекурсивно суммирует полные высоты детей с зазорами, берёт максимум с self-высотой.
 */
export function calcSubtreeHeight(
  node: MindMapNode,
  depth: number,
  verticalGap: number,
): number {
  const selfHeight = getNodeHeight(node, depth)

  if (node.collapsed || !node.children?.length) return selfHeight

  const childrenHeight = node.children.reduce(
    (sum, child) => sum + calcSubtreeHeight(child, depth + 1, verticalGap),
    0,
  )
  const gaps = (node.children.length - 1) * verticalGap

  return Math.max(selfHeight, childrenHeight + gaps)
}

/**
 * Ширина поддерева (для вертикальных раскладок).
 * Узлы с заметками расширяются до NOTES_MAX_WIDTH.
 */
export function calcSubtreeWidth(
  node: MindMapNode,
  depth: number,
  horizontalGap: number,
): number {
  const dims = getNodeDimensions(node, depth)
  const selfWidth = dims.totalWidth

  if (node.collapsed || !node.children?.length) return selfWidth

  const childrenWidth = node.children.reduce(
    (sum, child) => sum + calcSubtreeWidth(child, depth + 1, horizontalGap),
    0,
  )
  const gaps = (node.children.length - 1) * horizontalGap

  return Math.max(selfWidth, childrenWidth + gaps)
}

/**
 * Разделяет детей на правую и левую группы для двустороннего layout.
 * Чётные индексы → right, нечётные → left (чередование).
 */
export function splitChildrenLeftRight<T>(children: T[]): { right: T[]; left: T[] } {
  const right = children.filter((_, i) => i % 2 === 0)
  const left = children.filter((_, i) => i % 2 !== 0)
  return { right, left }
}

/**
 * Суммарная высота группы узлов с зазорами между ними.
 */
export function calcGroupHeight(
  nodes: MindMapNode[],
  depth: number,
  verticalGap: number,
): number {
  if (!nodes.length) return 0

  const total = nodes.reduce(
    (sum, node) => sum + calcSubtreeHeight(node, depth, verticalGap),
    0,
  )

  return total + (nodes.length - 1) * verticalGap
}
