// src/composables/layout/layoutTreeRight.js
import { GAP_H, GAP_V } from '../../constants'
import { getNodeWidth, getNodeHeight, calcSubtreeHeight } from './layoutUtils'

const H_GAP = GAP_H + 60
const V_GAP = GAP_V + 10

export function layoutTreeRight(root) {
  const positions = new Map()

  function place(node, x, yCenter, depth) {
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
  place(root, 100, totalH / 2 + 100, 0)
  return positions
}