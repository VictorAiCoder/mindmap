import type { MindMapNode } from '@entities/node'
import {
  NODE_W, NODE_H, ROOT_W, ROOT_H,
  NOTE_LINE_HEIGHT, NOTE_PADDING, NOTE_MAX_PREVIEW_LINES,
} from '../constants'

// TODO: вынести в constants как NODE_WITH_NOTES_MIN_WIDTH
const NOTES_MIN_WIDTH = 300

/**
 * Ширина узла по глубине.
 * Корень (depth=0) шире, остальные — стандартной ширины.
 */
export function getNodeWidth(depth: number): number {
  return depth === 0 ? ROOT_W : NODE_W
}

/**
 * Высота узла с учётом превью заметок.
 * Если у узла есть заметки — добавляется высота превью (до N строк).
 */
export function getNodeHeight(node: MindMapNode, depth: number): number {
  const baseHeight = depth === 0 ? ROOT_H : NODE_H

  if (!node.notes?.trim()) return baseHeight

  const lineCount = node.notes.split('\n').length
  const previewLines = Math.min(lineCount, NOTE_MAX_PREVIEW_LINES)
  const previewHeight = previewLines * NOTE_LINE_HEIGHT + NOTE_PADDING

  return baseHeight + previewHeight
}

/**
 * Высота поддерева (для горизонтальных раскладок).
 * Рекурсивно суммирует высоты детей с зазорами, берёт максимум с self-высотой.
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
 * Узлы с заметками расширяются до NOTES_MIN_WIDTH.
 */
export function calcSubtreeWidth(
  node: MindMapNode,
  depth: number,
  horizontalGap: number,
): number {
  const baseWidth = getNodeWidth(depth)
  const hasNotes = !!node.notes?.trim()
  const selfWidth = hasNotes ? Math.max(baseWidth, NOTES_MIN_WIDTH) : baseWidth

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