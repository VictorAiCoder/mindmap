// src/composables/tree/useTreeOperations.ts
import { triggerRef, type Ref } from 'vue'
import {
  findNodeById,
  findParentOf,
  isDescendantOf,
  detachNode,
  collectVisibleDescendantIds
} from './useTreeTraversal'
import { createNode } from './useNodeFactory'
import { applyAutoLayout, resetLayout } from '../layout/useAutoLayout'

import type { MindMapNode, ScenePosition } from '@/types/mindmap'
import type {
  TreeOperationsApi,
  HistoryApi,
  LayoutType
} from '@/types/mindmap-api'

import { NODE_SCALE } from '@/types/mindmap-constants'
import { clampScale, normalizeScale } from '@/composables/node/useNodeScale'
import { ROOT_W, ROOT_H, NODE_W, NODE_H } from '@/composables/constants'


export function useTreeOperations(
  rootNode: Ref<MindMapNode>,
  history: HistoryApi
): TreeOperationsApi {
  function touch(): void {
    triggerRef(rootNode)
  }

  function findNode(id: string): MindMapNode | null {
    return findNodeById(rootNode.value, id)
  }

  // ─── Notes visibility ───────────────────────────

  function toggleNotesVisible(nodeId: string): void {
    const node = findNode(nodeId)
    if (!node) return
    // undefined / true → false (скрываем)
    // false → true (показываем)
    node.notesVisible = node.notesVisible === false
    touch()
  }

  // ─── CRUD ───────────────────────────────────────

  function addChild(
    parentId: string,
    text: string = 'Новый узел'
  ): string | null {
    history.save()
    const parent = findNode(parentId)
    if (!parent) return null

    const node = createNode({ text })
    parent.children.push(node)
    parent.collapsed = false
    touch()
    return node.id
  }

  function deleteNode(nodeId: string): void {
    if (rootNode.value.id === nodeId) return
    history.save()
    detachNode(rootNode.value, nodeId)
    touch()
  }

  // ─── Обновление свойств ─────────────────────────

  function updateText(nodeId: string, newText: string): void {
    const node = findNode(nodeId)
    if (!node) return
    node.text = newText
    touch()
  }

  function updateColor(nodeId: string, newColor: string): void {
    history.save()
    const node = findNode(nodeId)
    if (!node) return
    node.color = newColor
    touch()
  }

  function updateNotes(nodeId: string, notes: string): void {
    const node = findNode(nodeId)
    if (!node) return
    node.notes = notes
    touch()
  }

  function updateNodePosition(
    nodeId: string,
    x: number | null,
    y: number | null
  ): void {
    const node = findNode(nodeId)
    if (!node) return
    node.customX = x
    node.customY = y
    touch()
  }

  // ─── Toggles ────────────────────────────────────

  function toggleCollapse(nodeId: string): void {
    const node = findNode(nodeId)
    if (!node) return
    node.collapsed = !node.collapsed
    touch()
  }

  function toggleNotePin(nodeId: string): void {
    const node = findNode(nodeId)
    if (!node) return
    node.notesPinned = !node.notesPinned
    touch()
  }

  // ─── Картинки ───────────────────────────────────

  function setNodeImage(nodeId: string, dataUrl: string): void {
    history.save()
    const node = findNode(nodeId)
    if (!node) return
    node.image = dataUrl
    touch()
  }

  function removeNodeImage(nodeId: string): void {
    history.save()
    const node = findNode(nodeId)
    if (!node) return
    node.image = null
    touch()
  }

  function setImageWidth(nodeId: string, width: number): void {
    const node = findNode(nodeId)
    if (!node) return
    node.imageWidth = width
    touch()
  }

  function commitImageResize(nodeId: string, width: number): void {
    history.save()
    const node = findNode(nodeId)
    if (!node) return
    node.imageWidth = width
    touch()
  }

  // ─── Layout ─────────────────────────────────────

  function resetAllPositions(): void {
    history.save()
    resetLayout(rootNode.value)
    touch()
  }

  function autoLayout(type: LayoutType = 'mindmap'): void {
    history.save()
    applyAutoLayout(rootNode.value, type)
    touch()
  }

  // ─── Перемещение в иерархии ─────────────────────

  function reparentNode(nodeId: string, newParentId: string): boolean {
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
    newParent.children.push(node)
    newParent.collapsed = false

    touch()
    return true
  }

  function moveNodeGroup(
    nodeId: string,
    dx: number,
    dy: number,
    layoutPositions?: Map<string, ScenePosition>
  ): void {
    const node = findNode(nodeId)
    if (!node) return

    history.save()

    const ids = collectVisibleDescendantIds(node)

    for (const id of ids) {
      const n = findNode(id)
      if (!n) continue

      // Если узел без customX/Y — берём из layout как стартовую точку
      if (n.customX === null || n.customY === null) {
        const layoutPos = layoutPositions?.get(id)
        if (layoutPos) {
          n.customX = layoutPos.x
          n.customY = layoutPos.y
        }
      }

      // Сдвигаем только если есть что сдвигать
      if (n.customX !== null && n.customY !== null) {
        n.customX += dx
        n.customY += dy
      }
    }

    touch()
  }

  function baseSize(isRoot: boolean): { w: number; h: number } {
    return isRoot
      ? { w: ROOT_W, h: ROOT_H }
      : { w: NODE_W, h: NODE_H }
  }

  function updateScale(
    nodeId: string,
    scale: number,
    savedCenter?: { cx: number; cy: number }
  ): void {
    const node = findNode(nodeId)
    if (!node) return

    const clamped = clampScale(scale)
    node.scale = clamped

    // Центрирование для закреплённых узлов
    if (node.customX != null && node.customY != null && savedCenter) {
      const isRoot = nodeId === rootNode.value.id
      const { w: baseW, h: baseH } = baseSize(isRoot)
      const newW = baseW * clamped
      const newH = baseH * clamped
      node.customX = savedCenter.cx - newW / 2
      node.customY = savedCenter.cy - newH / 2
    }

    touch()
  }

  /**
   * ★ Финальный commit scale С записью в историю.
   * Применяет snap-to-1.
   */
  function commitScale(
    nodeId: string,
    scale: number,
    savedCenter?: { cx: number; cy: number }
  ): void {
    const node = findNode(nodeId)
    if (!node) return

    // 1. История: snapshot ДО мутации
    history.save()

    // 2. Snap + clamp
    const final = normalizeScale(scale)
    // Не храним дефолтное значение — чище JSON при экспорте
    node.scale = final === NODE_SCALE.DEFAULT ? undefined : final

    // 3. Центрирование (если закреплён)
    if (node.customX != null && node.customY != null && savedCenter) {
      const isRoot = nodeId === rootNode.value.id
      const { w: baseW, h: baseH } = baseSize(isRoot)
      const newW = baseW * final
      const newH = baseH * final
      node.customX = savedCenter.cx - newW / 2
      node.customY = savedCenter.cy - newH / 2
    }

    touch()
  }


  return {
    addChild,
    deleteNode,
    updateText,
    updateColor,
    updateNotes,
    updateNodePosition,
    toggleCollapse,
    toggleNotePin,
    toggleNotesVisible,
    setNodeImage,
    removeNodeImage,
    setImageWidth,
    commitImageResize,
    resetAllPositions,
    autoLayout,
    reparentNode,
    moveNodeGroup,
    updateScale,
    commitScale,
    findNode
  }
}