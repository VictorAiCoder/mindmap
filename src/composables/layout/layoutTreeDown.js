// src/composables/layout/layoutTreeDown.js
import { GAP_H, DEFAULT_CENTER_X } from '../../constants'
import { getNodeWidth, getNodeHeight, calcSubtreeWidth } from './layoutUtils'

const V_GAP = 100
const H_GAP = GAP_H * 0.6

export function layoutTreeDown(root) {
  const positions = new Map()

  function place(node, xCenter, y, depth) {
    const w = getNodeWidth(depth)
    const h = getNodeHeight(node, depth)

    positions.set(node.id, { x: xCenter - w / 2, y })

    if (node.collapsed || !node.children?.length) return

    const childWidths = node.children.map(c => calcSubtreeWidth(c, depth + 1, H_GAP))
    const totalW = childWidths.reduce((s, w) => s + w, 0) + (childWidths.length - 1) * H_GAP

    let cx = xCenter - totalW / 2

    node.children.forEach((child, i) => {
      place(child, cx + childWidths[i] / 2, y + h + V_GAP, depth + 1)
      cx += childWidths[i] + H_GAP
    })
  }

  place(root, DEFAULT_CENTER_X, 100, 0)
  return positions
}