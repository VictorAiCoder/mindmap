// src/composables/useTreeOperations.js
import { triggerRef } from 'vue'
import { findNodeById, findParentOf, traverseTree, isDescendantOf, detachNode } from './useTreeTraversal'
import { createNode } from './useNodeFactory'
import { applyAutoLayout, resetLayout } from './useAutoLayout'

export function useTreeOperations(rootNode, history) {
  function touch() {
    triggerRef(rootNode)
  }

  function addChild(parentId, text = 'Новый узел') {
    history.save()
    const parent = findNodeById(rootNode.value, parentId)
    if (!parent) return null
    parent.children = parent.children ?? []
    const node = createNode({ text })
    parent.children.push(node)
    parent.collapsed = false
    touch()
    return node.id
  }

  function updateText(nodeId, newText) {
    const node = findNodeById(rootNode.value, nodeId)
    if (node) { node.text = newText; touch() }
  }

  function updateColor(nodeId, newColor) {
    history.save()
    const node = findNodeById(rootNode.value, nodeId)
    if (node) { node.color = newColor; touch() }
  }

  function deleteNode(nodeId) {
    if (rootNode.value.id === nodeId) return
    history.save()
    detachNode(rootNode.value, nodeId)
    touch()
  }

  function toggleCollapse(nodeId) {
    const node = findNodeById(rootNode.value, nodeId)
    if (!node) return
    node.collapsed = !node.collapsed
    touch()
  }

  function updateNodePosition(nodeId, x, y) {
    const node = findNodeById(rootNode.value, nodeId)
    if (!node) return
    node.customX = x
    node.customY = y
    touch()
  }

  function resetAllPositions() {
    history.save()
    resetLayout(rootNode.value)
    touch()
  }

  function autoLayout(type = 'mindmap') {
    history.save()
    applyAutoLayout(rootNode.value, type)
    touch()
  }

  function setNodeImage(nodeId, dataUrl) {
    history.save()
    const node = findNodeById(rootNode.value, nodeId)
    if (node) { node.image = dataUrl; touch() }
  }

  function removeNodeImage(nodeId) {
    history.save()
    const node = findNodeById(rootNode.value, nodeId)
    if (node) { node.image = null; touch() }
  }

  function updateNotes(nodeId, notes) {
    const node = findNodeById(rootNode.value, nodeId)
    if (node) { node.notes = notes; touch() }
  }

  /**
   * ★ Перемещает узел в иерархии: делает nodeId дочерним для newParentId
   *
   * Проверки:
   * - Нельзя переместить корень
   * - Нельзя бросить на себя
   * - Нельзя бросить на своего потомка (зацикливание)
   * - Нельзя бросить на текущего родителя (бессмысленно)
   */
  function reparentNode(nodeId, newParentId) {
    const root = rootNode.value

    // Нельзя перемещать корень
    if (nodeId === root.id) return false

    // Нельзя на себя
    if (nodeId === newParentId) return false

    // Нельзя на своего потомка
    if (isDescendantOf(root, nodeId, newParentId)) return false

    // Нельзя на текущего родителя (уже там)
    const currentParent = findParentOf(root, nodeId)
    if (currentParent?.id === newParentId) return false

    const newParent = findNodeById(root, newParentId)
    if (!newParent) return false

    history.save()

    // Отсоединяем от текущего родителя
    const node = detachNode(root, nodeId)
    if (!node) return false

    // Сбрасываем custom-координаты (узел будет заново размещён)
    node.customX = null
    node.customY = null

    // Присоединяем к новому родителю
    newParent.children = newParent.children ?? []
    newParent.children.push(node)
    newParent.collapsed = false

    touch()
    return true
  }

  return {
    addChild,
    updateText,
    updateColor,
    deleteNode,
    toggleCollapse,
    updateNodePosition,
    resetAllPositions,
    autoLayout,
    setNodeImage,
    removeNodeImage,
    updateNotes,
    reparentNode
  }
}