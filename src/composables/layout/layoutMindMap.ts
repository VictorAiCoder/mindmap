import { ROOT_W, ROOT_H, GAP_H, GAP_V, DEFAULT_CENTER_X } from '@/constants'
import type { MindMapNode, ScenePosition } from '@/types/mindmap'
import {
  getNodeWidth, getNodeHeight,
  calcSubtreeHeight, splitChildrenLeftRight, calcGroupHeight,
} from './layoutUtils'

const H_GAP = GAP_H + 40
const V_GAP = GAP_V + 10

type Side = 'left' | 'right'

function placeBranch(
  positions: Map<string, ScenePosition>,
  node: MindMapNode,
  x: number,
  yCenter: number,
  side: Side,
  depth: number,
): void {
  const w = getNodeWidth(depth)

  positions.set(node.id, { x, y: yCenter - getNodeHeight(node, depth) / 2 })

  if (node.collapsed || !node.children?.length) return

  const childHeights = node.children.map(c => calcSubtreeHeight(c, depth + 1, V_GAP))
  const totalH = childHeights.reduce((s, h) => s + h, 0) + (childHeights.length - 1) * V_GAP
  const childX = side === 'right'
    ? x + w + H_GAP
    : x - getNodeWidth(depth + 1) - H_GAP

  let cy = yCenter - totalH / 2

  node.children.forEach((child, i) => {
    placeBranch(positions, child, childX, cy + childHeights[i] / 2, side, depth + 1)
    cy += childHeights[i] + V_GAP
  })
}

export function layoutMindMap(root: MindMapNode): Map<string, ScenePosition> {
  const positions = new Map<string, ScenePosition>()
  const children = root.children || []
  const { right, left } = splitChildrenLeftRight(children)

  const rightH = calcGroupHeight(right, 1, V_GAP)
  const leftH = calcGroupHeight(left, 1, V_GAP)
  const maxH = Math.max(rightH, leftH, ROOT_H) // ← БЫЛО ROOT_W, исправлена опечатка

  const cx = DEFAULT_CENTER_X
  const cy = maxH / 2 + 100

  positions.set(root.id, { x: cx - ROOT_W / 2, y: cy - getNodeHeight(root, 0) / 2 })

  if (root.collapsed || !children.length) return positions

  const baseX = cx - ROOT_W / 2

  let ry = cy - rightH / 2
  right.forEach(child => {
    const h = calcSubtreeHeight(child, 1, V_GAP)
    placeBranch(positions, child, baseX + ROOT_W + H_GAP, ry + h / 2, 'right', 1)
    ry += h + V_GAP
  })

  let ly = cy - leftH / 2
  left.forEach(child => {
    const h = calcSubtreeHeight(child, 1, V_GAP)
    placeBranch(positions, child, baseX - getNodeWidth(1) - H_GAP, ly + h / 2, 'left', 1)
    ly += h + V_GAP
  })

  return positions
}