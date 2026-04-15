// src/composables/tree/useTreeOperations.js
import { triggerRef } from 'vue'
import {
  findNodeById, findParentOf, traverseTree,
  isDescendantOf, detachNode, collectVisibleDescendantIds
} from './useTreeTraversal'
import { createNode } from './useNodeFactory'
import { applyAutoLayout, resetLayout } from '../layout/useAutoLayout'

export function useTreeOperations(rootNode, history) {
  function touch() {
    triggerRef(rootNode)
  }

  function findNode(id) {
    return findNodeById(rootNode.value, id)
  }

  // --- CRUD ---

  function addChild(parentId, text = 'Новый узел') {
    history.save()
    const parent = findNode(parentId)
    if (!parent) return null

    parent.children = parent.children ?? []
    const node = createNode({ text })
    parent.children.push(node)
    parent.collapsed = false
    touch()
    return node.id
  }

  function deleteNode(nodeId) {
    if (rootNode.value.id === nodeId) return
    history.save()
    detachNode(rootNode.value, nodeId)
    touch()
  }

  // --- Обновление свойств ---

  function updateText(nodeId, newText) {
    const node = findNode(nodeId)
    if (node) { node.text = newText; touch() }
  }

  function updateColor(nodeId, newColor) {
    history.save()
    const node = findNode(nodeId)
    if (node) { node.color = newColor; touch() }
  }

  function updateNotes(nodeId, notes) {
    const node = findNode(nodeId)
    if (node) { node.notes = notes; touch() }
  }

  function updateNodePosition(nodeId, x, y) {
    const node = findNode(nodeId)
    if (node) { node.customX = x; node.customY = y; touch() }
  }

  // --- Collapse ---

  function toggleCollapse(nodeId) {
    const node = findNode(nodeId)
    if (node) { node.collapsed = !node.collapsed; touch() }
  }

  // --- Картинки ---

  function setNodeImage(nodeId, dataUrl) {
    history.save()
    const node = findNode(nodeId)
    if (node) { node.image = dataUrl; touch() }
  }

  function removeNodeImage(nodeId) {
    history.save()
    const node = findNode(nodeId)
    if (node) { node.image = null; touch() }
  }

  // --- Раскладка ---

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

  // --- Перемещение в иерархии ---

  function reparentNode(nodeId, newParentId) {
    const root = rootNode.value

    if (nodeId === root.id) return false
    if (nodeId === newParentId) return false
    if (isDescendantOf(root, nodeId, newParentId)) return false

    const currentParent = findParentOf(root, nodeId)
    if (currentParent?.id === newParentId) return false

    const newParent = findNode(newParentId)
    if (!newParent) return false

    history.save()

    const node = detachNode(root, nodeId)
    if (!node) return false

    node.customX = null
    node.customY = null
    newParent.children = newParent.children ?? []
    newParent.children.push(node)
    newParent.collapsed = false

    touch()
    return true
  }

  /**
   * ★ Перемещает узел и все его видимые потомки на (dx, dy).
   *
   * Для каждого узла в группе:
   *   - Если уже есть customX/Y — прибавляем дельту
   *   - Если нет — берём текущую авто-позицию из layout и фиксируем
   */
  function moveNodeGroup(nodeId, dx, dy, layoutPositions) {
    const node = findNode(nodeId)
    if (!node) return

    history.save()

    const ids = collectVisibleDescendantIds(node)

    ids.forEach(id => {
      const n = findNode(id)
      if (!n) return

      // Если нет custom-позиции — нужно взять текущую computed позицию
      // Передаём её через layoutPositions map
      if (n.customX == null || n.customY == null) {
        const layoutPos = layoutPositions?.get(id)
        if (layoutPos) {
          n.customX = layoutPos.x
          n.customY = layoutPos.y
        }
      }

      if (n.customX != null && n.customY != null) {
        n.customX += dx
        n.customY += dy
      }
    })

    touch()
  }

  function setImageWidth(nodeId, width) {
    const node = findNode(nodeId)
    if (!node) return
    // Без history.save() — ресайз происходит часто,
    // сохраняем snapshot только при commitResize
    node.imageWidth = width
    touch()
  }

  function commitImageResize(nodeId, width) {
    history.save()
    const node = findNode(nodeId)
    if (!node) return
    node.imageWidth = width
    touch()
  }

  // В return добавить:
  return {
    addChild, deleteNode,
    updateText, updateColor, updateNotes, updateNodePosition,
    toggleCollapse,
    setNodeImage, removeNodeImage,
    setImageWidth, commitImageResize,    // ★
    resetAllPositions, autoLayout,
    reparentNode, moveNodeGroup
  }
}