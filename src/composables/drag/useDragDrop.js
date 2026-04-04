// src/composables/drag/useDragDrop.js
import { ref } from 'vue'
import { findNodeById, findParentOf } from '../tree/useTreeTraversal'

/**
 * Drag & Drop узлов между родителями (через список)
 * Используется для перетаскивания в боковых панелях / списках
 *
 * Для перетаскивания на канвасе используется useNodeDrag.js
 */
export function useDragDrop(rootNode, history) {
  const draggedNodeId = ref(null)
  const dropTargetNodeId = ref(null)

  function startDrag(nodeId) {
    draggedNodeId.value = nodeId
  }

  function setDropTarget(nodeId) {
    if (nodeId !== draggedNodeId.value) {
      dropTargetNodeId.value = nodeId
    }
  }

  function clearDropTarget() {
    dropTargetNodeId.value = null
  }

  /**
   * Завершает drag & drop — перемещает узел к новому родителю
   */
  function finishDrop() {
    const sourceId = draggedNodeId.value
    const targetId = dropTargetNodeId.value

    draggedNodeId.value = null
    dropTargetNodeId.value = null

    if (!sourceId || !targetId || sourceId === targetId) return false

    const root = rootNode.value

    // Нельзя перетащить корень
    if (root.id === sourceId) return false

    // Нельзя бросить на потомка
    if (isAncestorOf(root, sourceId, targetId)) return false

    // Нельзя на текущего родителя
    const currentParent = findParentOf(root, sourceId)
    if (currentParent?.id === targetId) return false

    const target = findNodeById(root, targetId)
    if (!target) return false

    history.save()

    // Отсоединяем от текущего родителя
    const parent = findParentOf(root, sourceId)
    if (!parent?.children) return false

    const idx = parent.children.findIndex(c => c.id === sourceId)
    if (idx === -1) return false

    const [node] = parent.children.splice(idx, 1)

    // Сбрасываем координаты
    node.customX = null
    node.customY = null

    // Присоединяем к новому родителю
    target.children = target.children ?? []
    target.children.push(node)
    target.collapsed = false

    return true
  }

  function cancelDrag() {
    draggedNodeId.value = null
    dropTargetNodeId.value = null
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

/**
 * Проверяет, является ли targetId потомком ancestorId
 */
function isAncestorOf(root, ancestorId, targetId) {
  const ancestor = findNodeById(root, ancestorId)
  if (!ancestor) return false

  function check(node) {
    if (node.id === targetId) return true
    return node.children?.some(check) ?? false
  }

  return check(ancestor)
}