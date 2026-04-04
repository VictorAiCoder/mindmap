// src/composables/canvas/useConnections.js
import { computed } from 'vue'

/**
 * Строит bezier-кривые между узлами
 */
export function useConnections(rootNode, positionMap) {
  const connections = computed(() => {
    const map = positionMap.value
    const root = rootNode.value
    if (!root || !map.size) return []

    const result = []
    buildConnections(root, map, result)
    return result
  })

  return { connections }
}

function buildConnections(node, posMap, result) {
  if (node.collapsed || !node.children?.length) return

  const pp = posMap.get(node.id)
  if (!pp) return

  for (const child of node.children) {
    const cp = posMap.get(child.id)
    if (!cp) continue

    const path = calcBezierPath(pp, cp)

    result.push({
      id: `${node.id}__${child.id}`,
      path,
      color: child.color || '#999'
    })

    buildConnections(child, posMap, result)
  }
}

function calcBezierPath(parent, child) {
  const parentCenterX = parent.x + parent.w / 2
  const childCenterX = child.x + child.w / 2

  let sx, sy, ex, ey

  if (childCenterX >= parentCenterX) {
    sx = parent.x + parent.w
    sy = parent.y + parent.h / 2
    ex = child.x
    ey = child.y + child.h / 2
  } else {
    sx = parent.x
    sy = parent.y + parent.h / 2
    ex = child.x + child.w
    ey = child.y + child.h / 2
  }

  const dist = Math.abs(ex - sx)
  const dx = Math.min(dist * 0.45, 80)
  const isRight = ex > sx
  const cp1x = isRight ? sx + dx : sx - dx
  const cp2x = isRight ? ex - dx : ex + dx

  return `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ey}, ${ex} ${ey}`
}