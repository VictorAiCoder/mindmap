// src/composables/layout/useLayout.js
import { computed } from 'vue'
import {
  NODE_W, NODE_H, ROOT_W, ROOT_H,
  GAP_H, GAP_V, CANVAS_PADDING
} from '../../constants'
import { traverseTree } from '../tree/useTreeTraversal'

/**
 * Вычисляет позиции узлов на канвасе.
 *
 * Если у узла есть customX/customY — использует их.
 * Иначе — автоматический расчёт (mind map layout).
 */
export function useLayout(rootNode) {
  const layoutData = computed(() => {
    const root = rootNode.value
    if (!root) return emptyLayout()

    const positions = calcPositions(root)
    const bounds = calcBounds(positions)

    return { positions, bounds }
  })

  return { layoutData }
}

// ─── Пустая раскладка ───────────────────────

function emptyLayout() {
  return {
    positions: [],
    bounds: {
      minX: 0, minY: 0,
      maxX: 1600, maxY: 900,
      width: 1600, height: 900
    }
  }
}

// ─── Расчёт позиций ────────────────────────

function calcPositions(root) {
  // Сначала считаем автоматические позиции
  const autoPositions = calcAutoPositions(root)

  // Собираем финальные позиции с учётом custom
  const positions = []

  traverseTree(root, (node) => {
    if (root.collapsed && node !== root) return

    const auto = autoPositions.get(node.id)
    if (!auto) return

    const hasCustom = node.customX != null && node.customY != null

    positions.push({
      id: node.id,
      node,
      x: hasCustom ? node.customX : auto.x,
      y: hasCustom ? node.customY : auto.y,
      w: auto.w,
      h: auto.h,
      depth: auto.depth,
      hasCustomPos: hasCustom
    })
  })

  return positions
}

// ─── Автоматический Mind Map Layout ─────────

function calcAutoPositions(root) {
  const map = new Map()

  // Шаг 1: вычислить высоту каждого поддерева
  function subtreeHeight(node, depth) {
    const h = nodeHeight(depth)

    if (node.collapsed || !node.children?.length) return h

    const childrenH = node.children.reduce(
      (sum, child) => sum + subtreeHeight(child, depth + 1),
      0
    )
    const gaps = (node.children.length - 1) * GAP_V

    return Math.max(h, childrenH + gaps)
  }

  // Шаг 2: расположить ветку (рекурсивно)
  function placeBranch(node, x, yCenter, side, depth) {
    const w = nodeWidth(depth)
    const h = nodeHeight(depth)

    map.set(node.id, { x, y: yCenter - h / 2, w, h, depth })

    if (node.collapsed || !node.children?.length) return

    const childHeights = node.children.map(c => subtreeHeight(c, depth + 1))
    const totalH = childHeights.reduce((s, v) => s + v, 0)
      + (childHeights.length - 1) * GAP_V

    const childX = side === 'right'
      ? x + w + GAP_H
      : x - nodeWidth(depth + 1) - GAP_H

    let cy = yCenter - totalH / 2

    node.children.forEach((child, i) => {
      const ch = childHeights[i]
      placeBranch(child, childX, cy + ch / 2, side, depth + 1)
      cy += ch + GAP_V
    })
  }

  // Шаг 3: разделить детей корня на правую/левую стороны
  const children = root.children || []
  const right = children.filter((_, i) => i % 2 === 0)
  const left = children.filter((_, i) => i % 2 !== 0)

  const rightH = groupHeight(right, 1, subtreeHeight)
  const leftH = groupHeight(left, 1, subtreeHeight)
  const maxH = Math.max(rightH, leftH, ROOT_H)

  const cx = 800
  const cy = maxH / 2 + CANVAS_PADDING

  // Корень
  map.set(root.id, {
    x: cx - ROOT_W / 2,
    y: cy - ROOT_H / 2,
    w: ROOT_W,
    h: ROOT_H,
    depth: 0
  })

  if (!root.collapsed && children.length) {
    const baseX = cx - ROOT_W / 2

    // Правая сторона
    let ry = cy - rightH / 2
    right.forEach(child => {
      const h = subtreeHeight(child, 1)
      placeBranch(child, baseX + ROOT_W + GAP_H, ry + h / 2, 'right', 1)
      ry += h + GAP_V
    })

    // Левая сторона
    let ly = cy - leftH / 2
    left.forEach(child => {
      const h = subtreeHeight(child, 1)
      placeBranch(child, baseX - NODE_W - GAP_H, ly + h / 2, 'left', 1)
      ly += h + GAP_V
    })
  }

  return map
}

// ─── Расчёт границ ─────────────────────────

function calcBounds(positions) {
  if (!positions.length) {
    return { minX: 0, minY: 0, maxX: 1600, maxY: 900, width: 1600, height: 900 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const pos of positions) {
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + pos.w)
    maxY = Math.max(maxY, pos.y + pos.h)
  }

  minX -= CANVAS_PADDING
  minY -= CANVAS_PADDING
  maxX += CANVAS_PADDING
  maxY += CANVAS_PADDING

  return {
    minX, minY, maxX, maxY,
    width: maxX - minX,
    height: maxY - minY
  }
}

// ─── Утилиты размеров ──────────────────────

function nodeWidth(depth) {
  return depth === 0 ? ROOT_W : NODE_W
}

function nodeHeight(depth) {
  return depth === 0 ? ROOT_H : NODE_H
}

function groupHeight(nodes, depth, subtreeHeightFn) {
  if (!nodes.length) return 0

  const total = nodes.reduce(
    (sum, node) => sum + subtreeHeightFn(node, depth),
    0
  )

  return total + (nodes.length - 1) * GAP_V
}