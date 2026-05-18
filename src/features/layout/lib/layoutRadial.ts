import { GAP_H, DEFAULT_CENTER_X, DEFAULT_CENTER_Y } from '@/shared/config/constants'
import type { MindMapNode, ScenePosition } from '@entities/node'
import { getNodeDimensions } from '@entities/node/model/useNodeDimensions'
import { getNodeCoreHeight } from './layoutUtils'

// ★ Увеличен с 360 до 420 чтобы учесть картинки над узлами
const BASE_RADIUS = 420
const RADIUS_STEP = GAP_H + 60
const NOTES_EXTRA_RADIUS = 160
const SPAN_DECAY = 0.85

function coreWidth(node: MindMapNode, depth: number): number {
  return getNodeDimensions(node, depth).coreWidth
}

export function layoutRadial(root: MindMapNode): Map<string, ScenePosition> {
  const positions = new Map<string, ScenePosition>()
  const cx = DEFAULT_CENTER_X
  const cy = DEFAULT_CENTER_Y

  const rootDims = getNodeDimensions(root, 0)
  positions.set(root.id, { x: cx - rootDims.coreWidth / 2, y: cy - rootDims.coreHeight / 2 })

  if (root.collapsed || !root.children?.length) return positions

  const children = root.children
  const fullAngle = Math.PI * 2
  const spanPerChild = fullAngle / children.length
  const hasNotesChildren = children.some(c => c.notes?.trim())
  const radius = hasNotesChildren ? BASE_RADIUS + NOTES_EXTRA_RADIUS : BASE_RADIUS

  children.forEach((child, i) => {
    const angle = -Math.PI / 2 + i * spanPerChild
    placeRadial(positions, cx, cy, child, angle, radius, spanPerChild * 0.8, 1)
  })

  return positions
}

function placeRadial(
  positions: Map<string, ScenePosition>,
  cx: number,
  cy: number,
  node: MindMapNode,
  angle: number,
  radius: number,
  angleSpan: number,
  depth: number,
): void {
  const w = coreWidth(node, depth)
  const h = getNodeCoreHeight(node, depth)

  positions.set(node.id, {
    x: cx + Math.cos(angle) * radius - w / 2,
    y: cy + Math.sin(angle) * radius - h / 2,
  })

  if (node.collapsed || !node.children?.length) return

  const children = node.children
  const childSpan = angleSpan / Math.max(children.length, 1)
  const startAngle = angle - angleSpan / 2 + childSpan / 2
  const hasNotes = children.some(c => c.notes?.trim())
  const nextRadius = radius + RADIUS_STEP + (hasNotes ? NOTES_EXTRA_RADIUS : 0)

  children.forEach((child, i) => {
    const childAngle = startAngle + i * childSpan
    placeRadial(positions, cx, cy, child, childAngle, nextRadius, childSpan * SPAN_DECAY, depth + 1)
  })
}
