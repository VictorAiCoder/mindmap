// src/composables/canvas/useConnections.ts
import { computed, type ComputedRef, type Ref } from 'vue'
import type { MindMapNode } from '@/types/mindmap'
import type { LayoutData, LayoutPosition } from '@/types/layout'
import { calcBezierPath, type NodeBox } from '@shared/lib/bezier'

/**
 * Одна соединительная линия между родителем и ребёнком.
 */
interface Connection {
  id: string           // "parentId__childId"
  parentId: string
  childId: string
  path: string         // SVG path
  color: string        // цвет линии (из child.color)
}

/**
 * Функция получения live-координат узла (из drag-сервиса).
 *
 * Принимает id узла и его layout-координаты (originalX, originalY) —
 * они используются drag-сервисом как база для расчёта live-позиции:
 *   live.x = originalX + dragDeltaX
 *
 * Возвращает {x, y} если узел сейчас в drag-группе, иначе null.
 */
export type GetLivePosition = (
  nodeId: string,
  originalX: number,
  originalY: number
) => { x: number; y: number } | null

/**
 * Composable для расчёта SVG-соединений между узлами.
 *
 * Учитывает:
 * - текущее состояние layout (из useLayout)
 * - live-координаты узлов, которые сейчас перетаскиваются (из useNodeDrag)
 * - collapsed-узлы (их потомки исключаются)
 *
 * @param rootNode — реактивная ссылка на корень дерева
 * @param layoutData — реактивный layout (позиции + bounds)
 * @param getLivePosition — функция-провайдер live-координат при drag'е
 */
export function useConnections(
  rootNode: Ref<MindMapNode>,
  layoutData: Ref<LayoutData>,
  getLivePosition: GetLivePosition
): ComputedRef<Connection[]> {
  /**
   * Строит карту id → актуальная позиция (с учётом drag'а).
   */
  function buildLivePositionMap(
    positions: LayoutPosition[]
  ): Map<string, NodeBox> {
    const map = new Map<string, NodeBox>()
    for (const pos of positions) {
      const live = getLivePosition(pos.id, pos.x, pos.y)
      const { x, y } = live ?? pos
      map.set(pos.id, { x, y, w: pos.w, h: pos.h })
    }
    return map
  }

  /**
   * Рекурсивно обходит дерево и строит соединения parent → child.
   * Свёрнутые узлы пропускают своих потомков.
   */
  function buildConnections(
    node: MindMapNode,
    posMap: Map<string, NodeBox>,
    out: Connection[]
  ): void {
    if (node.collapsed || !node.children.length) return

    const parentBox = posMap.get(node.id)
    if (!parentBox) return

    for (const child of node.children) {
      const childBox = posMap.get(child.id)
      if (!childBox) continue

      out.push({
        id: `${node.id}__${child.id}`,
        parentId: node.id,
        childId: child.id,
        path: calcBezierPath(parentBox, childBox),
        color: child.color || '#999',
      })

      buildConnections(child, posMap, out)
    }
  }

  const connections = computed<Connection[]>(() => {
    const positions = layoutData.value.positions
    if (!positions.length) return []

    const posMap = buildLivePositionMap(positions)
    const result: Connection[] = []
    buildConnections(rootNode.value, posMap, result)
    return result
  })

  return connections
}