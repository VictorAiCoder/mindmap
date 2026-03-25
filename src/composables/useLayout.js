// src/composables/useLayout.js
import { computed } from 'vue'
import { NODE_W, NODE_H, ROOT_W, ROOT_H, GAP_H, GAP_V } from './constants'

function getH(depth) { return depth === 0 ? ROOT_H : NODE_H }
function getW(depth) { return depth === 0 ? ROOT_W : NODE_W }

function subtreeHeight(node, depth = 0) {
  const selfH = getH(depth)
  if (node.collapsed || !node.children?.length) return selfH

  const childrenH = node.children.reduce(
    (sum, child) => sum + subtreeHeight(child, depth + 1), 0
  ) + (node.children.length - 1) * GAP_V

  return Math.max(selfH, childrenH)
}

function placeBranch(node, x, yCenter, side, depth, result) {
  const w = getW(depth)
  const h = getH(depth)

  const baseX = x
  const baseY = yCenter - h / 2

  const finalX = node.customX != null ? node.customX : baseX
  const finalY = node.customY != null ? node.customY : baseY

  result.push({
    id: node.id,
    x: finalX,
    y: finalY,
    baseX,
    baseY,
    w,
    h,
    depth,
    side,
    node,
    hasCustomPos: node.customX != null && node.customY != null
  })

  if (node.collapsed || !node.children?.length) return

  const childH = node.children.map(c => subtreeHeight(c, depth + 1))
  const totalH = childH.reduce((s, h) => s + h, 0) + (childH.length - 1) * GAP_V

  const childX = side === 'right' ? x + w + GAP_H : x - NODE_W - GAP_H

  let currentY = yCenter - totalH / 2

  node.children.forEach((child, i) => {
    const thisH = childH[i]
    const childCenter = currentY + thisH / 2
    placeBranch(child, childX, childCenter, side, depth + 1, result)
    currentY += thisH + GAP_V
  })
}

function buildConnections(root, posMap) {
  const connections = []

  function walk(node) {
    if (node.collapsed || !node.children?.length) return
    const pp = posMap.get(node.id)
    if (!pp) return

    for (const child of node.children) {
      const cp = posMap.get(child.id)
      if (!cp) continue

      let sx, sy, ex, ey
      const childCenterX = cp.x + cp.w / 2
      const parentCenterX = pp.x + pp.w / 2

      if (childCenterX >= parentCenterX) {
        sx = pp.x + pp.w; sy = pp.y + pp.h / 2
        ex = cp.x;        ey = cp.y + cp.h / 2
      } else {
        sx = pp.x;          sy = pp.y + pp.h / 2
        ex = cp.x + cp.w;   ey = cp.y + cp.h / 2
      }

      const dist = Math.abs(ex - sx)
      const dx = Math.min(dist * 0.45, 80)
      const isRight = ex > sx
      const cp1x = isRight ? sx + dx : sx - dx
      const cp2x = isRight ? ex - dx : ex + dx

      connections.push({
        id: `${node.id}__${child.id}`,
        path: `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ey}, ${ex} ${ey}`,
        color: child.color || '#999'
      })

      walk(child)
    }
  }

  walk(root)
  return connections
}

function calcBounds(positions, pad = 120) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const p of positions) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + p.w)
    maxY = Math.max(maxY, p.y + p.h)
  }

  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2
  }
}

function makeRootPosition(root, cx, cy) {
  const w = ROOT_W
  const h = ROOT_H
  const baseX = cx - w / 2
  const baseY = cy - h / 2

  return {
    id: root.id,
    x: root.customX != null ? root.customX : baseX,
    y: root.customY != null ? root.customY : baseY,
    baseX,
    baseY,
    w,
    h,
    depth: 0,
    side: 'center',
    node: root,
    hasCustomPos: root.customX != null && root.customY != null
  }
}

export function useLayout(rootNode) {
  const emptyResult = {
    positions: [],
    connections: [],
    bounds: { minX: 0, minY: 0, maxX: 1600, maxY: 900, width: 1600, height: 900 }
  }

  const layoutData = computed(() => {
    const root = rootNode.value
    if (!root) return emptyResult

    const positions = []

    // Корень без детей или свёрнут
    if (root.collapsed || !root.children?.length) {
      positions.push(makeRootPosition(root, 1200, 200))
      return {
        positions,
        connections: [],
        bounds: calcBounds(positions)
      }
    }

    // Разделяем детей на две стороны
    const children = root.children
    const rightChildren = children.filter((_, i) => i % 2 === 0)
    const leftChildren = children.filter((_, i) => i % 2 !== 0)

    // Высоты сторон
    const rightH = rightChildren.reduce((s, c) => s + subtreeHeight(c, 1), 0)
      + Math.max(0, rightChildren.length - 1) * GAP_V
    const leftH = leftChildren.reduce((s, c) => s + subtreeHeight(c, 1), 0)
      + Math.max(0, leftChildren.length - 1) * GAP_V

    const maxH = Math.max(rightH, leftH, ROOT_H)
    const centerX = 1200
    const centerY = maxH / 2 + 100

    // Корень
    const rootPos = makeRootPosition(root, centerX, centerY)
    positions.push(rootPos)
    const rootBaseX = rootPos.baseX

    // Правая ветка
    let ry = centerY - rightH / 2
    rightChildren.forEach(child => {
      const h = subtreeHeight(child, 1)
      placeBranch(child, rootBaseX + ROOT_W + GAP_H, ry + h / 2, 'right', 1, positions)
      ry += h + GAP_V
    })

    // Левая ветка
    let ly = centerY - leftH / 2
    leftChildren.forEach(child => {
      const h = subtreeHeight(child, 1)
      placeBranch(child, rootBaseX - NODE_W - GAP_H, ly + h / 2, 'left', 1, positions)
      ly += h + GAP_V
    })

    // Линии и границы
    const posMap = new Map(positions.map(p => [p.id, p]))
    const connections = buildConnections(root, posMap)
    const bounds = calcBounds(positions)

    return { positions, connections, bounds }
  })

  return { layoutData }
}