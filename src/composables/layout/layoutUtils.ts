// src/composables/layout/layoutUtils.js
import {
  NODE_W, NODE_H, ROOT_W, ROOT_H,
  NOTE_LINE_HEIGHT, NOTE_PADDING, NOTE_MAX_PREVIEW_LINES
} from '../../constants'

/**
 * Ширина узла по глубине
 */
export function getNodeWidth(depth) {
  return depth === 0 ? ROOT_W : NODE_W
}

/**
 * Высота узла с учётом превью заметок
 */
export function getNodeHeight(node, depth) {
  const baseHeight = depth === 0 ? ROOT_H : NODE_H

  if (!node.notes?.trim()) return baseHeight

  const lineCount = node.notes.split('\n').length
  const previewLines = Math.min(lineCount, NOTE_MAX_PREVIEW_LINES)
  const previewHeight = previewLines * NOTE_LINE_HEIGHT + NOTE_PADDING

  return baseHeight + previewHeight
}

/**
 * Высота поддерева (для горизонтальных раскладок)
 */
export function calcSubtreeHeight(node, depth, verticalGap) {
  const selfHeight = getNodeHeight(node, depth)

  if (node.collapsed || !node.children?.length) return selfHeight

  const childrenHeight = node.children.reduce(
    (sum, child) => sum + calcSubtreeHeight(child, depth + 1, verticalGap),
    0
  )
  const gaps = (node.children.length - 1) * verticalGap

  return Math.max(selfHeight, childrenHeight + gaps)
}

/**
 * Ширина поддерева (для вертикальных раскладок)
 */
export function calcSubtreeWidth(node, depth, horizontalGap) {
  const hasNotes = !!node.notes?.trim()
  const selfWidth = Math.max(getNodeWidth(depth), hasNotes ? 300 : getNodeWidth(depth))

  if (node.collapsed || !node.children?.length) return selfWidth

  const childrenWidth = node.children.reduce(
    (sum, child) => sum + calcSubtreeWidth(child, depth + 1, horizontalGap),
    0
  )
  const gaps = (node.children.length - 1) * horizontalGap

  return Math.max(selfWidth, childrenWidth + gaps)
}

/**
 * Разделяет детей на правую и левую группы
 */
export function splitChildrenLeftRight(children) {
  const right = children.filter((_, i) => i % 2 === 0)
  const left = children.filter((_, i) => i % 2 !== 0)
  return { right, left }
}

/**
 * Суммарная высота группы узлов с зазорами
 */
export function calcGroupHeight(nodes, depth, verticalGap) {
  if (!nodes.length) return 0

  const total = nodes.reduce(
    (sum, node) => sum + calcSubtreeHeight(node, depth, verticalGap),
    0
  )

  return total + (nodes.length - 1) * verticalGap
}