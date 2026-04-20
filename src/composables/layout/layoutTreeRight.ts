import type { MindMapNode } from '@/types/mindmap'
import { GAP_H, GAP_V } from '../constants'
import { getNodeWidth, getNodeHeight, calcSubtreeHeight } from './layoutUtils'
import type { PositionsMap } from './layoutTreeDown'

const H_GAP = GAP_H + 60
const V_GAP = GAP_V + 10

export function layoutTreeRight(root: MindMapNode): PositionsMap {
  const positions: PositionsMap = new Map()

  function place(
    node: MindMapNode,
    x: number,
    yCenter: number,
    depth: number
  ): void {
    positions.set(node.id, {
      x,
      y: yCenter - getNodeHeight(node, depth) / 2,
    })

    if (node.collapsed || node.children.length === 0) return

    const childHeights = node.children.map((c: MindMapNode) =>
      calcSubtreeHeight(c, depth + 1, V_GAP)
    )
    const totalH =
      childHeights.reduce((s: number, ch: number) => s + ch, 0) +
      (childHeights.length - 1) * V_GAP

    let cy = yCenter - totalH / 2

    node.children.forEach((child: MindMapNode, i: number) => {
      const ch = childHeights[i] ?? 0
      place(child, x + getNodeWidth(depth) + H_GAP, cy + ch / 2, depth + 1)
      cy += ch + V_GAP
    })
  }

  const totalH = calcSubtreeHeight(root, 0, V_GAP)
  place(root, 100, totalH / 2 + 100, 0)
  return positions
}