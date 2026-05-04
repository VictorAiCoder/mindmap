import type { MindMapNode } from '@entities/node'
import { GAP_H, DEFAULT_CENTER_X } from '../constants'
import { getNodeWidth, getNodeHeight, calcSubtreeWidth } from './layoutUtils'

export interface NodePosition {
  x: number
  y: number
}

export type PositionsMap = Map<string, NodePosition>

const V_GAP = 100
const H_GAP = GAP_H * 0.6

export function layoutTreeDown(root: MindMapNode): PositionsMap {
  const positions: PositionsMap = new Map()

  function place(
    node: MindMapNode,
    xCenter: number,
    y: number,
    depth: number
  ): void {
    const w = getNodeWidth(depth)
    const h = getNodeHeight(node, depth)

    positions.set(node.id, { x: xCenter - w / 2, y })

    if (node.collapsed || node.children.length === 0) return

    const childWidths = node.children.map((c: MindMapNode) =>
      calcSubtreeWidth(c, depth + 1, H_GAP)
    )
    const totalW =
      childWidths.reduce((s: number, cw: number) => s + cw, 0) +
      (childWidths.length - 1) * H_GAP

    let cx = xCenter - totalW / 2

    node.children.forEach((child: MindMapNode, i: number) => {
      const cw = childWidths[i] ?? 0
      place(child, cx + cw / 2, y + h + V_GAP, depth + 1)
      cx += cw + H_GAP
    })
  }

  place(root, DEFAULT_CENTER_X, 100, 0)
  return positions
}