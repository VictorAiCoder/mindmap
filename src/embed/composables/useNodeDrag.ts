// embed/composables/useNodeDrag.ts
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { findNodeById, collectVisibleDescendantIds } from '@entities/mindmap'
import { readApiRef } from '../lib/readApiRef'
import type { MindMapApi } from '../types/mindmap-api'
import type { MindMapNode } from '@entities/node'
import type { PositionMap } from '@features/layout'

const MOVE_THRESHOLD = 4

export interface NodeDragApi {
  draggingNodeId: Ref<string | null>
  isDraggingNode: ComputedRef<boolean>
  dropTargetId: Ref<string | null>
  dragGroupIds: Ref<Set<string>>
  dragDeltaX: ComputedRef<number>
  dragDeltaY: ComputedRef<number>

  startNodeDrag(e: MouseEvent, nodeId: string, nodeX: number, nodeY: number): void
  getLivePosition(
    nodeId: string,
    originalX: number,
    originalY: number
  ): { x: number; y: number } | null
  isInDragGroup(nodeId: string): boolean
  setDropTarget(nodeId: string): void
  clearDropTarget(): void
}

/**
 * Управляет состоянием drag'а узлов и перемещает группу через mindmap API.
 *
 * @param mindmap            — API для применения операций (reparent / moveNodeGroup)
 * @param zoom               — текущий zoom канваса (для компенсации scale при расчёте delta)
 * @param getLayoutPositions — функция, возвращающая текущую карту позиций.
 *                             Вызывается в момент finishDrag, чтобы передать актуальные
 *                             координаты для узлов без customX/Y.
 */
export function useNodeDrag(
  mindmap: MindMapApi,
  zoom: Ref<number>,
  getLayoutPositions: () => PositionMap
): NodeDragApi {
  const draggingNodeId = ref<string | null>(null)
  const dragStartX = ref<number>(0)
  const dragStartY = ref<number>(0)
  const dragCurrentX = ref<number>(0)
  const dragCurrentY = ref<number>(0)
  const hasMoved = ref<boolean>(false)
  const dropTargetId = ref<string | null>(null)
  const dragGroupIds = ref<Set<string>>(new Set())

  const isDraggingNode = computed<boolean>(() => draggingNodeId.value !== null)

  const dragDeltaX = computed<number>(() => {
    if (!draggingNodeId.value) return 0
    return (dragCurrentX.value - dragStartX.value) / zoom.value
  })

  const dragDeltaY = computed<number>(() => {
    if (!draggingNodeId.value) return 0
    return (dragCurrentY.value - dragStartY.value) / zoom.value
  })

  function startNodeDrag(
    e: MouseEvent,
    nodeId: string,
    _nodeX: number,
    _nodeY: number
  ): void {
    draggingNodeId.value = nodeId
    dragStartX.value = e.clientX
    dragStartY.value = e.clientY
    dragCurrentX.value = e.clientX
    dragCurrentY.value = e.clientY
    hasMoved.value = false
    dropTargetId.value = null

    const root = readApiRef<MindMapNode>(mindmap.rootNode)
    const node = findNodeById(root, nodeId)
    dragGroupIds.value = node
      ? collectVisibleDescendantIds(node)
      : new Set([nodeId])

    const onMove = (me: MouseEvent): void => {
      dragCurrentX.value = me.clientX
      dragCurrentY.value = me.clientY

      const dx = Math.abs(me.clientX - dragStartX.value)
      const dy = Math.abs(me.clientY - dragStartY.value)
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
        hasMoved.value = true
      }
    }

    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)

      if (hasMoved.value) finishDrag()

      draggingNodeId.value = null
      dropTargetId.value = null
      dragGroupIds.value = new Set()
      hasMoved.value = false
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function finishDrag(): void {
    if (!draggingNodeId.value) return

    const target = dropTargetId.value
    const id = draggingNodeId.value

    if (target && target !== id) {
      mindmap.reparentNode(id, target)
    } else {
      const dx = dragDeltaX.value
      const dy = dragDeltaY.value
      // Передаём актуальные позиции напрямую — никаких monkey-patch
      mindmap.moveNodeGroup(id, dx, dy, getLayoutPositions())
    }
  }

  function isInDragGroup(nodeId: string): boolean {
    return dragGroupIds.value.has(nodeId)
  }

  function getLivePosition(
    nodeId: string,
    originalX: number,
    originalY: number
  ): { x: number; y: number } | null {
    if (!isInDragGroup(nodeId)) return null

    return {
      x: originalX + dragDeltaX.value,
      y: originalY + dragDeltaY.value
    }
  }

  function setDropTarget(nodeId: string): void {
    if (dragGroupIds.value.has(nodeId)) return
    dropTargetId.value = nodeId
  }

  function clearDropTarget(): void {
    dropTargetId.value = null
  }

  return {
    draggingNodeId,
    isDraggingNode,
    dropTargetId,
    dragGroupIds,
    dragDeltaX,
    dragDeltaY,
    startNodeDrag,
    getLivePosition,
    isInDragGroup,
    setDropTarget,
    clearDropTarget
  }
}
