import {
  findParentOf,
  isDescendantOf,
  detachNode,
  collectVisibleDescendantIds,
  createNode
} from '@entities/mindmap'
import type { MindMapNode, ScenePosition } from '@entities/node'
import type { TreeCore } from './useTreeCore'
import type { HistoryApi } from '../types/history'
import type { PositionMap } from '@features/layout/model/types'

export interface TreeStructureApi {
  findNode: (id: string) => MindMapNode | null
  addChild: (parentId: string, text?: string) => string | null
  deleteNode: (nodeId: string) => void
  updateText: (nodeId: string, text: string) => void
  updateColor: (nodeId: string, color: string) => void
  updateNotes: (nodeId: string, notes: string) => void
  updateNodePosition: (nodeId: string, x: number | null, y: number | null) => void
  toggleCollapse: (nodeId: string) => void
  toggleNotePin: (nodeId: string) => void
  toggleNotesVisible: (nodeId: string) => void
  reparentNode: (nodeId: string, newParentId: string) => boolean
  moveNodeGroup: (nodeId: string, dx: number, dy: number, layoutPositions?: PositionMap) => void
}

export function useTreeStructure(core: TreeCore, history: HistoryApi): TreeStructureApi {
  const { rootRef, findNode, touch } = core

  // ─── Notes visibility ───────────────────────────

  function toggleNotesVisible(nodeId: string): void {
    const node = findNode(nodeId)
    if (!node) return
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
    if (rootRef().id === nodeId) return
    history.save()
    detachNode(rootRef(), nodeId)
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

  // ─── Перемещение в иерархии ─────────────────────

  function reparentNode(nodeId: string, newParentId: string): boolean {
    const root = rootRef()

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

      if (n.customX === null || n.customY === null) {
        const layoutPos = layoutPositions?.get(id)
        if (layoutPos) {
          n.customX = layoutPos.x
          n.customY = layoutPos.y
        }
      }

      if (n.customX !== null && n.customY !== null) {
        n.customX += dx
        n.customY += dy
      }
    }

    touch()
  }

  return {
    findNode,
    addChild,
    deleteNode,
    updateText,
    updateColor,
    updateNotes,
    updateNodePosition,
    toggleCollapse,
    toggleNotePin,
    toggleNotesVisible,
    reparentNode,
    moveNodeGroup,
  }
}
