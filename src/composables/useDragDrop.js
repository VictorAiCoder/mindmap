// src/composables/useDragDrop.js
// Логика перетаскивания узлов

import { ref } from 'vue'
import { findNodeById, findParentOf, isDescendantOf } from './useTreeTraversal'

export function useDragDrop(rootNode, history) {
  const draggedNodeId = ref(null)
  const draggedParentId = ref(null)

  function start(nodeId) {
    draggedNodeId.value = nodeId
    const parent = findParentOf(rootNode.value, nodeId)
    draggedParentId.value = parent?.id ?? null
  }

  function end() {
    draggedNodeId.value = null
    draggedParentId.value = null
  }

  function dropOn(targetId) {
    const sourceId = draggedNodeId.value
    if (!sourceId || sourceId === targetId) return end()

    const draggedObj = findNodeById(rootNode.value, sourceId)
    if (!draggedObj) return end()

    // Защита от циклов: нельзя бросить в собственного потомка
    if (isDescendantOf(draggedObj, targetId)) return end()

    // Бессмысленно бросать в текущего родителя
    if (draggedParentId.value === targetId) return end()

    history.save()

    // Отсоединяем от старого родителя
    const oldParent = findParentOf(rootNode.value, sourceId)
    const idx = oldParent?.children?.findIndex((c) => c.id === sourceId) ?? -1
    if (idx === -1) return end()

    const [movedNode] = oldParent.children.splice(idx, 1)

    // Присоединяем к новому
    const newParent = findNodeById(rootNode.value, targetId)
    if (newParent) {
      newParent.children = newParent.children ?? []
      newParent.children.push(movedNode)
      newParent.collapsed = false
    }

    end()
  }

  return { draggedNodeId, draggedParentId, start, end, dropOn }
}