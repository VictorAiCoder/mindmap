import { GAP_H } from '@/shared/config/constants'
import type { MindMapNode, ScenePosition } from '@entities/node'
import { getNodeWidth, getNodeHeight, calcSubtreeHeight } from './layoutUtils'

const V_GAP = 12
const H_GAP = GAP_H * 0.65

export function layoutCompact(root: MindMapNode): Map<string, ScenePosition> {
  const positions = new Map<string, ScenePosition>()

  function place(node: MindMapNode, x: number, yCenter: number, depth: number): void {
    positions.set(node.id, { x, y: yCenter - getNodeHeight(node, depth) / 2 })

    if (node.collapsed || !node.children?.length) return

    const childHeights = node.children.map(c => calcSubtreeHeight(c, depth + 1, V_GAP))
    const totalH = childHeights.reduce((s, h) => s + h, 0) + (childHeights.length - 1) * V_GAP

    let cy = yCenter - totalH / 2

    node.children.forEach((child, i) => {
      place(child, x + getNodeWidth(depth) + H_GAP, cy + childHeights[i] / 2, depth + 1)
      cy += childHeights[i] + V_GAP
    })
  }

  const totalH = calcSubtreeHeight(root, 0, V_GAP)
  place(root, 100, totalH / 2 + 80, 0)
  return positions
}