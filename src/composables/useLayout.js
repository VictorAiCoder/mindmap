// src/composables/useLayout.js
import { computed } from 'vue'

const NODE_W = 160
const NODE_H = 40
const ROOT_W = 200
const ROOT_H = 50
const GAP_H = 100
const GAP_V = 14

function subtreeHeight(node, depth = 0) {
  const selfH = depth === 0 ? ROOT_H : NODE_H
  if (node.collapsed || !node.children?.length) return selfH

  const childrenH = node.children.reduce(
    (sum, child) => sum + subtreeHeight(child, depth + 1),
    0
  ) + (node.children.length - 1) * GAP_V

  return Math.max(selfH, childrenH)
}

function placeBranch(node, x, yCenter, side, depth, result) {
  const w = depth === 0 ? ROOT_W : NODE_W
  const h = depth === 0 ? ROOT_H : NODE_H

  result.push({
    id: node.id,
    x,
    y: yCenter - h / 2,
    w,
    h,
    depth,
    side,
    node
  })

  // ← ВОТ КЛЮЧЕВОЕ: если свёрнут — не размещаем детей
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

export function useLayout(rootNode) {
  const layoutData = computed(() => {
    const root = rootNode.value
    if (!root) {
      return {
        positions: [],
        connections: [],
        bounds: { minX: 0, minY: 0, maxX: 1600, maxY: 900, width: 1600, height: 900 }
      }
    }

    const positions = []

    // ★ ИСПРАВЛЕНИЕ: если корень свёрнут — показываем только его
    if (root.collapsed || !root.children?.length) {
      const centerX = 1200
      const centerY = 200

      positions.push({
        id: root.id,
        x: centerX - ROOT_W / 2,
        y: centerY - ROOT_H / 2,
        w: ROOT_W,
        h: ROOT_H,
        depth: 0,
        side: 'center',
        node: root
      })

      const pad = 120
      return {
        positions,
        connections: [],
        bounds: {
          minX: positions[0].x - pad,
          minY: positions[0].y - pad,
          maxX: positions[0].x + ROOT_W + pad,
          maxY: positions[0].y + ROOT_H + pad,
          width: ROOT_W + pad * 2,
          height: ROOT_H + pad * 2
        }
      }
    }

    const children = root.children
    const rightChildren = children.filter((_, i) => i % 2 === 0)
    const leftChildren = children.filter((_, i) => i % 2 !== 0)

    const rightH = rightChildren.reduce((s, c) => s + subtreeHeight(c, 1), 0)
      + Math.max(0, rightChildren.length - 1) * GAP_V
    const leftH = leftChildren.reduce((s, c) => s + subtreeHeight(c, 1), 0)
      + Math.max(0, leftChildren.length - 1) * GAP_V

    const maxH = Math.max(rightH, leftH, ROOT_H)

    const centerX = 1200
    const centerY = maxH / 2 + 100

    const rootX = centerX - ROOT_W / 2

    positions.push({
      id: root.id,
      x: rootX,
      y: centerY - ROOT_H / 2,
      w: ROOT_W,
      h: ROOT_H,
      depth: 0,
      side: 'center',
      node: root
    })

    let ry = centerY - rightH / 2
    rightChildren.forEach(child => {
      const h = subtreeHeight(child, 1)
      placeBranch(child, rootX + ROOT_W + GAP_H, ry + h / 2, 'right', 1, positions)
      ry += h + GAP_V
    })

    let ly = centerY - leftH / 2
    leftChildren.forEach(child => {
      const h = subtreeHeight(child, 1)
      placeBranch(child, rootX - NODE_W - GAP_H, ly + h / 2, 'left', 1, positions)
      ly += h + GAP_V
    })

    const posMap = new Map(positions.map(p => [p.id, p]))
    const connections = []

    function buildConns(node) {
      // ★ ИСПРАВЛЕНИЕ: проверяем collapsed на каждом уровне
      if (node.collapsed || !node.children?.length) return
      const pp = posMap.get(node.id)
      if (!pp) return

      for (const child of node.children) {
        const cp = posMap.get(child.id)
        if (!cp) continue

        let sx, sy, ex, ey

        if (cp.side === 'right') {
          sx = pp.x + pp.w
          sy = pp.y + pp.h / 2
          ex = cp.x
          ey = cp.y + cp.h / 2
        } else {
          sx = pp.x
          sy = pp.y + pp.h / 2
          ex = cp.x + cp.w
          ey = cp.y + cp.h / 2
        }

        const dx = Math.abs(ex - sx) * 0.45
        const cp1x = cp.side === 'right' ? sx + dx : sx - dx
        const cp2x = cp.side === 'right' ? ex - dx : ex + dx

        connections.push({
          id: `${node.id}__${child.id}`,
          path: `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ey}, ${ex} ${ey}`,
          color: child.color || '#999'
        })

        buildConns(child)
      }
    }

    buildConns(root)

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of positions) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x + p.w)
      maxY = Math.max(maxY, p.y + p.h)
    }

    const pad = 120
    return {
      positions,
      connections,
      bounds: {
        minX: minX - pad,
        minY: minY - pad,
        maxX: maxX + pad,
        maxY: maxY + pad,
        width: maxX - minX + pad * 2,
        height: maxY - minY + pad * 2
      }
    }
  })

  return { layoutData }
}