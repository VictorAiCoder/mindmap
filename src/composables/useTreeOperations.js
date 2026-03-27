// src/composables/useTreeOperations.js
import { triggerRef } from 'vue'
import { findNodeById, findParentOf, traverseTree } from './useTreeTraversal'
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
    const parent = findParentOf(rootNode.value, nodeId)
    if (!parent?.children) return
    const idx = parent.children.findIndex((c) => c.id === nodeId)
    if (idx !== -1) { parent.children.splice(idx, 1); touch() }
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

  // ★ Применение авто-раскладки по типу
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
    updateNotes
  }
}