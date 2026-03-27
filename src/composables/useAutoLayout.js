// src/composables/useAutoLayout.js
import { NODE_W, NODE_H, ROOT_W, ROOT_H, GAP_H, GAP_V } from './constants'
import { traverseTree } from './useTreeTraversal'

function getW(depth) { return depth === 0 ? ROOT_W : NODE_W }

/**
 * ★ Высота узла с учётом превью заметок
 *
 * Базовая высота узла + высота превью (7 строк × ~18px + отступы)
 * Превью показывается под узлом, поэтому добавляем к общей высоте
 */
function getH(node, depth) {
  const baseH = depth === 0 ? ROOT_H : NODE_H

  if (!node.notes?.trim()) return baseH

  // Считаем строки превью (максимум 7)
  const lines = node.notes.split('\n')
  const previewLines = Math.min(lines.length, 7)

  // Высота превью: строки × высота строки + padding + margin
  const lineHeight = 18
  const previewPadding = 20 + 6 // padding (10*2) + margin-top
  const previewH = previewLines * lineHeight + previewPadding

  return baseH + previewH
}

/**
 * Высота поддерева для горизонтальных раскладок
 */
function subtreeH(node, depth = 0) {
  const selfH = getH(node, depth)
  if (node.collapsed || !node.children?.length) return selfH

  const childrenH = node.children.reduce(
    (sum, child) => sum + subtreeH(child, depth + 1), 0
  ) + (node.children.length - 1) * GAP_V

  return Math.max(selfH, childrenH)
}

/**
 * Ширина поддерева для вертикальных раскладок
 * Учитываем что узлы с заметками шире (превью до 280px)
 */
function subtreeW(node, depth = 0) {
  const hasNotes = !!node.notes?.trim()
  const selfW = Math.max(getW(depth), hasNotes ? 280 : getW(depth))

  if (node.collapsed || !node.children?.length) return selfW

  const hGap = GAP_H * 0.6
  const childrenW = node.children.reduce(
    (sum, child) => sum + subtreeW(child, depth + 1), 0
  ) + (node.children.length - 1) * hGap

  return Math.max(selfW, childrenW)
}

// ═══════════════════════════════════════════
// 1. MIND MAP — влево + вправо от центра
// ═══════════════════════════════════════════

function layoutMindMap(root) {
  const positions = new Map()
  const hGap = GAP_H + 40 // ★ увеличенный горизонтальный зазор
  const vGap = GAP_V + 10 // ★ увеличенный вертикальный зазор

  function subtreeHLocal(node, depth = 0) {
    const selfH = getH(node, depth)
    if (node.collapsed || !node.children?.length) return selfH
    const ch = node.children.reduce(
      (sum, c) => sum + subtreeHLocal(c, depth + 1), 0
    ) + (node.children.length - 1) * vGap
    return Math.max(selfH, ch)
  }

  function placeBranch(node, x, yCenter, side, depth) {
    const w = getW(depth)
    const h = getH(node, depth)

    positions.set(node.id, { x, y: yCenter - h / 2 })

    if (node.collapsed || !node.children?.length) return

    const childH = node.children.map(c => subtreeHLocal(c, depth + 1))
    const totalH = childH.reduce((s, h) => s + h, 0) + (childH.length - 1) * vGap
    const childX = side === 'right' ? x + w + hGap : x - NODE_W - hGap

    let cy = yCenter - totalH / 2

    node.children.forEach((child, i) => {
      const thisH = childH[i]
      placeBranch(child, childX, cy + thisH / 2, side, depth + 1)
      cy += thisH + vGap
    })
  }

  const children = root.children || []
  const right = children.filter((_, i) => i % 2 === 0)
  const left = children.filter((_, i) => i % 2 !== 0)

  const rightH = right.reduce((s, c) => s + subtreeHLocal(c, 1), 0)
    + Math.max(0, right.length - 1) * vGap
  const leftH = left.reduce((s, c) => s + subtreeHLocal(c, 1), 0)
    + Math.max(0, left.length - 1) * vGap

  const maxH = Math.max(rightH, leftH, ROOT_H)
  const cx = 1200
  const cy = maxH / 2 + 100

  positions.set(root.id, { x: cx - ROOT_W / 2, y: cy - ROOT_H / 2 })

  if (!root.collapsed && children.length) {
    const rootBaseX = cx - ROOT_W / 2

    let ry = cy - rightH / 2
    right.forEach(child => {
      const h = subtreeHLocal(child, 1)
      placeBranch(child, rootBaseX + ROOT_W + hGap, ry + h / 2, 'right', 1)
      ry += h + vGap
    })

    let ly = cy - leftH / 2
    left.forEach(child => {
      const h = subtreeHLocal(child, 1)
      placeBranch(child, rootBaseX - NODE_W - hGap, ly + h / 2, 'left', 1)
      ly += h + vGap
    })
  }

  return positions
}

// ═══════════════════════════════════════════
// 2. TREE DOWN — корень сверху, дети вниз
// ═══════════════════════════════════════════

function layoutTreeDown(root) {
  const positions = new Map()
  const vGap = 100 // ★ больше места под превью
  const hGap = GAP_H * 0.6

  function subtreeWLocal(node, depth = 0) {
    const hasNotes = !!node.notes?.trim()
    const selfW = Math.max(getW(depth), hasNotes ? 300 : getW(depth))
    if (node.collapsed || !node.children?.length) return selfW
    const childrenW = node.children.reduce(
      (sum, c) => sum + subtreeWLocal(c, depth + 1), 0
    ) + (node.children.length - 1) * hGap
    return Math.max(selfW, childrenW)
  }

  function place(node, xCenter, y, depth) {
    const w = getW(depth)
    const h = getH(node, depth)

    positions.set(node.id, { x: xCenter - w / 2, y })

    if (node.collapsed || !node.children?.length) return

    const childWidths = node.children.map(c => subtreeWLocal(c, depth + 1))
    const totalW = childWidths.reduce((s, w) => s + w, 0) + (childWidths.length - 1) * hGap
    let cx = xCenter - totalW / 2

    node.children.forEach((child, i) => {
      const cw = childWidths[i]
      place(child, cx + cw / 2, y + h + vGap, depth + 1)
      cx += cw + hGap
    })
  }

  place(root, 1200, 100, 0)
  return positions
}

// ═══════════════════════════════════════════
// 3. TREE RIGHT — корень слева, всё вправо
// ═══════════════════════════════════════════

function layoutTreeRight(root) {
  const positions = new Map()
  const hGap = GAP_H + 60  // ★ больше места для превью по горизонтали
  const vGap = GAP_V + 10

  function subtreeHLocal(node, depth = 0) {
    const selfH = getH(node, depth)
    if (node.collapsed || !node.children?.length) return selfH
    const ch = node.children.reduce(
      (sum, c) => sum + subtreeHLocal(c, depth + 1), 0
    ) + (node.children.length - 1) * vGap
    return Math.max(selfH, ch)
  }

  function place(node, x, yCenter, depth) {
    const w = getW(depth)
    const h = getH(node, depth)

    positions.set(node.id, { x, y: yCenter - h / 2 })

    if (node.collapsed || !node.children?.length) return

    const childH = node.children.map(c => subtreeHLocal(c, depth + 1))
    const totalH = childH.reduce((s, h) => s + h, 0) + (childH.length - 1) * vGap

    let cy = yCenter - totalH / 2

    node.children.forEach((child, i) => {
      const thisH = childH[i]
      place(child, x + w + hGap, cy + thisH / 2, depth + 1)
      cy += thisH + vGap
    })
  }

  const totalH = subtreeHLocal(root, 0)
  place(root, 100, totalH / 2 + 100, 0)
  return positions
}

// ═══════════════════════════════════════════
// 4. RADIAL — корень в центре, дети по кругу
// ═══════════════════════════════════════════

function layoutRadial(root) {
  const positions = new Map()
  const cx = 1200
  const cy = 600

  positions.set(root.id, { x: cx - ROOT_W / 2, y: cy - ROOT_H / 2 })

  if (root.collapsed || !root.children?.length) return positions

  function placeRadial(node, angle, radius, angleSpan, depth) {
    const w = getW(depth)
    const h = getH(node, depth)

    const nx = cx + Math.cos(angle) * radius - w / 2
    const ny = cy + Math.sin(angle) * radius - h / 2

    positions.set(node.id, { x: nx, y: ny })

    if (node.collapsed || !node.children?.length) return

    const children = node.children
    const childCount = children.length
    const childSpan = angleSpan / Math.max(childCount, 1)
    const startAngle = angle - angleSpan / 2 + childSpan / 2

    // ★ Радиус зависит от наличия заметок — узлы с заметками дальше
    const hasNotesChildren = children.some(c => c.notes?.trim())
    const extraRadius = hasNotesChildren ? 60 : 0
    const nextRadius = radius + GAP_H + 60 + extraRadius

    children.forEach((child, i) => {
      const childAngle = startAngle + i * childSpan
      const nextSpan = childSpan * 0.85
      placeRadial(child, childAngle, nextRadius, nextSpan, depth + 1)
    })
  }

  const children = root.children
  const total = children.length
  const fullAngle = Math.PI * 2
  const spanPerChild = fullAngle / total

  // ★ Увеличенный базовый радиус
  const hasNotesRoot = children.some(c => c.notes?.trim())
  const baseRadius = hasNotesRoot ? 320 : 260

  children.forEach((child, i) => {
    const angle = -Math.PI / 2 + i * spanPerChild
    placeRadial(child, angle, baseRadius, spanPerChild * 0.8, 1)
  })

  return positions
}

// ═══════════════════════════════════════════
// 5. COMPACT — компактная (меньше отступы)
// ═══════════════════════════════════════════

function layoutCompact(root) {
  const positions = new Map()
  const compactGapV = 12
  const compactGapH = GAP_H * 0.65

  function subtreeHCompact(node, depth = 0) {
    const selfH = getH(node, depth)
    if (node.collapsed || !node.children?.length) return selfH
    const ch = node.children.reduce(
      (sum, c) => sum + subtreeHCompact(c, depth + 1), 0
    ) + (node.children.length - 1) * compactGapV
    return Math.max(selfH, ch)
  }

  function place(node, x, yCenter, depth) {
    const w = getW(depth)
    const h = getH(node, depth)

    positions.set(node.id, { x, y: yCenter - h / 2 })

    if (node.collapsed || !node.children?.length) return

    const childH = node.children.map(c => subtreeHCompact(c, depth + 1))
    const totalH = childH.reduce((s, h) => s + h, 0) + (childH.length - 1) * compactGapV

    let cy = yCenter - totalH / 2

    node.children.forEach((child, i) => {
      const thisH = childH[i]
      place(child, x + w + compactGapH, cy + thisH / 2, depth + 1)
      cy += thisH + compactGapV
    })
  }

  const totalH = subtreeHCompact(root, 0)
  place(root, 100, totalH / 2 + 80, 0)
  return positions
}

// ═══════════════════════════════════════════
// 6. ★ SPACIOUS — просторная (максимум места)
// ═══════════════════════════════════════════

function layoutSpacious(root) {
  const positions = new Map()
  const hGap = GAP_H + 80
  const vGap = GAP_V + 30

  function subtreeHLocal(node, depth = 0) {
    const selfH = getH(node, depth)
    if (node.collapsed || !node.children?.length) return selfH
    const ch = node.children.reduce(
      (sum, c) => sum + subtreeHLocal(c, depth + 1), 0
    ) + (node.children.length - 1) * vGap
    return Math.max(selfH, ch)
  }

  function placeBranch(node, x, yCenter, side, depth) {
    const w = getW(depth)
    const h = getH(node, depth)

    positions.set(node.id, { x, y: yCenter - h / 2 })

    if (node.collapsed || !node.children?.length) return

    const childH = node.children.map(c => subtreeHLocal(c, depth + 1))
    const totalH = childH.reduce((s, h) => s + h, 0) + (childH.length - 1) * vGap
    const childX = side === 'right' ? x + w + hGap : x - NODE_W - hGap

    let cy = yCenter - totalH / 2

    node.children.forEach((child, i) => {
      const thisH = childH[i]
      placeBranch(child, childX, cy + thisH / 2, side, depth + 1)
      cy += thisH + vGap
    })
  }

  const children = root.children || []
  const right = children.filter((_, i) => i % 2 === 0)
  const left = children.filter((_, i) => i % 2 !== 0)

  const rightH = right.reduce((s, c) => s + subtreeHLocal(c, 1), 0)
    + Math.max(0, right.length - 1) * vGap
  const leftH = left.reduce((s, c) => s + subtreeHLocal(c, 1), 0)
    + Math.max(0, left.length - 1) * vGap

  const maxH = Math.max(rightH, leftH, ROOT_H)
  const cx = 1200
  const cy = maxH / 2 + 120

  positions.set(root.id, { x: cx - ROOT_W / 2, y: cy - ROOT_H / 2 })

  if (!root.collapsed && children.length) {
    const rootBaseX = cx - ROOT_W / 2

    let ry = cy - rightH / 2
    right.forEach(child => {
      const h = subtreeHLocal(child, 1)
      placeBranch(child, rootBaseX + ROOT_W + hGap, ry + h / 2, 'right', 1)
      ry += h + vGap
    })

    let ly = cy - leftH / 2
    left.forEach(child => {
      const h = subtreeHLocal(child, 1)
      placeBranch(child, rootBaseX - NODE_W - hGap, ly + h / 2, 'left', 1)
      ly += h + vGap
    })
  }

  return positions
}

// ═══════════════════════════════════════════
// Экспорт
// ═══════════════════════════════════════════

export const LAYOUT_TYPES = {
  mindmap:   { label: 'Mind Map',       icon: 'mdi-brain',              fn: layoutMindMap },
  spacious:  { label: 'Просторная',     icon: 'mdi-arrow-expand-all',   fn: layoutSpacious },
  treeDown:  { label: 'Дерево вниз',    icon: 'mdi-file-tree',          fn: layoutTreeDown },
  treeRight: { label: 'Дерево вправо',  icon: 'mdi-file-tree-outline',  fn: layoutTreeRight },
  radial:    { label: 'Радиальная',     icon: 'mdi-blur-radial',        fn: layoutRadial },
  compact:   { label: 'Компактная',     icon: 'mdi-view-compact',       fn: layoutCompact }
}

/**
 * Применяет раскладку — записывает customX/customY для каждого узла
 */
export function applyAutoLayout(root, type = 'mindmap') {
  const layout = LAYOUT_TYPES[type]
  if (!layout) return

  const positions = layout.fn(root)

  traverseTree(root, (node) => {
    const pos = positions.get(node.id)
    if (pos) {
      node.customX = pos.x
      node.customY = pos.y
    }
  })
}

/**
 * Сбрасывает все координаты
 */
export function resetLayout(root) {
  traverseTree(root, (node) => {
    node.customX = null
    node.customY = null
  })
}