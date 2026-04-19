// src/composables/drag/useDragDrop.ts
import { ref, type Ref } from 'vue'
import {
  findNodeById,
  findParentOf,
  isDescendantOf,
  detachNode
} from '../tree/useTreeTraversal'

import type { MindMapNode } from '@/types/mindmap'
import type { DragDropApi, HistoryApi } from '@/types/mindmap-api'

/**
 * State-менеджер операции drag&drop в списках.
 *
 * Реальную мутацию дерева делает finishDrop() —
 * он дублирует логику reparentNode из useTreeOperations.
 *
 * TODO: избавиться от дублирования, инжектя reparentNode сюда.
 */
export function useDragDrop(
  rootNode: Ref<MindMapNode>,
  history: HistoryApi
): DragDropApi {
  const draggedNodeId = ref<string | null>(null)
  const dropTargetNodeId = ref<string | null>(null)

  function startDrag(nodeId: string): void {
    draggedNodeId.value = nodeId
  }

  function setDropTarget(nodeId: string): void {
    if (nodeId === draggedNodeId.value) return
    dropTargetNodeId.value = nodeId
  }

  function clearDropTarget(): void {
    dropTargetNodeId.value = null
  }

  function cancelDrag(): void {
    draggedNodeId.value = null
    dropTargetNodeId.value = null
  }

  /**
   * Завершает drag: перемещает draggedNodeId в dropTargetNodeId.
   * Возвращает true, если перемещение прошло успешно.
   */
  function finishDrop(): boolean {
    const sourceId = draggedNodeId.value
    const targetId = dropTargetNodeId.value

    // Сброс UI-состояния делаем в любом случае
    draggedNodeId.value = null
    dropTargetNodeId.value = null

    if (!sourceId || !targetId) return false
    if (sourceId === targetId) return false

    const root = rootNode.value
    if (sourceId === root.id) return false

    // Нельзя бросить узел на его же потомка
    if (isDescendantOf(root, sourceId, targetId)) return false

    // Если уже родитель — ничего не делаем
    const currentParent = findParentOf(root, sourceId)
    if (currentParent?.id === targetId) return false

    const targetNode = findNodeById(root, targetId)
    if (!targetNode) return false

    history.save()

    const node = detachNode(root, sourceId)
    if (!node) return false

    node.customX = null
    node.customY = null
    targetNode.children.push(node)
    targetNode.collapsed = false

    return true
  }

  return {
    draggedNodeId,
    dropTargetNodeId,
    startDrag,
    setDropTarget,
    clearDropTarget,
    finishDrop,
    cancelDrag
  }
}