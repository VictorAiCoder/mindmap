// src/composables/useTreeOperations.js
import { triggerRef } from 'vue'
import { findNodeById, findParentOf, traverseTree } from './useTreeTraversal'
import { createNode } from './useNodeFactory'

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
    if (node) {
      node.text = newText
      touch()
    }
  }

  function updateColor(nodeId, newColor) {
    history.save()
    const node = findNodeById(rootNode.value, nodeId)
    if (node) {
      node.color = newColor
      touch()
    }
  }

  function deleteNode(nodeId) {
    if (rootNode.value.id === nodeId) return
    history.save()
    const parent = findParentOf(rootNode.value, nodeId)
    if (!parent?.children) return

    const idx = parent.children.findIndex((c) => c.id === nodeId)
    if (idx !== -1) {
      parent.children.splice(idx, 1)
      touch()
    }
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
    traverseTree(rootNode.value, (node) => {
      node.customX = null
      node.customY = null
    })
    touch()
  }

  function setNodeImage(nodeId, dataUrl) {
    history.save()
    const node = findNodeById(rootNode.value, nodeId)
    if (!node) return
    node.image = dataUrl
    touch()
  }

  function removeNodeImage(nodeId) {
    history.save()
    const node = findNodeById(rootNode.value, nodeId)
    if (!node) return
    node.image = null
    touch()
  }

  // ★ Обновление заметки
  function updateNotes(nodeId, notes) {
    const node = findNodeById(rootNode.value, nodeId)
    if (!node) return
    node.notes = notes
    touch()
  }

  return {
    addChild,
    updateText,
    updateColor,
    deleteNode,
    toggleCollapse,
    updateNodePosition,
    resetAllPositions,
    setNodeImage,
    removeNodeImage,
    updateNotes
  }
}