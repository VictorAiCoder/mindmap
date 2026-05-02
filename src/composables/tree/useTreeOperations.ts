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

import type { MindMapNode, MindMapDocument, ScenePosition, RawImage } from '@/types/mindmap'
import type {
  TreeOperationsApi,
  HistoryApi,
  LayoutType
} from '@/types/mindmap-api'

import { NODE_SCALE } from '@/types/mindmap-constants'
import { clampScale, normalizeScale } from '@/composables/node/useNodeScale'
import { ROOT_W, ROOT_H, NODE_W, NODE_H } from '@/composables/constants'

import { parseMarkdownToTree } from '../persistence/importMarkdown'

// ─── Helpers ────────────────────────────────────────

/**
 * Генератор id для картинок. Дублируется с useImageStorage
 * намеренно — чтобы избежать циклических зависимостей.
 */
function generateImageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `img_${crypto.randomUUID()}`
  }
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ─── Composable ─────────────────────────────────────

export function useTreeOperations(
  document: Ref<MindMapDocument>,
  history: HistoryApi
): TreeOperationsApi {

  // Удобные геттеры, но без кэширования —
  // всегда читаем актуальное состояние документа.
  const rootRef = () => document.value.root
  const imagesRef = () => document.value.images

  function touch(): void {
    // triggerRef на корневом document — реактивные зависимости
    // (rootNode computed, nodeCount, treeDepth и т.д.) пересчитаются.
    triggerRef(document)
  }

  function findNode(id: string): MindMapNode | null {
    return findNodeById(rootRef(), id)
  }

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

  // ─── Картинки ───────────────────────────────────

  /**
   * Устанавливает картинку узла: создаёт запись в пуле и сохраняет imageId.
   *
   * Политика: старая картинка (если была) в пуле НЕ удаляется.
   * Причины:
   *   1) undo/redo — нужна возможность вернуться к предыдущей;
   *   2) картинка может использоваться другими узлами.
   * Чистка неиспользуемых — через галерею (Коммит 3)
   * и автоматически при экспорте в JSON.
   */
  function setNodeImage(nodeId: string, dataUrl: string): void {
    const node = findNode(nodeId)
    if (!node) return

    history.save()

    const raw: RawImage = {
      kind: 'raw',
      id: generateImageId(),
      dataUrl,
      createdAt: Date.now(),
    }
    imagesRef().push(raw)

    node.imageId = raw.id
    touch()
  }

  function removeNodeImage(nodeId: string): void {
    const node = findNode(nodeId)
    if (!node || node.imageId === null) return

    history.save()
    node.imageId = null
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
    resetLayout(rootRef())
    touch()
  }

  function autoLayout(type: LayoutType = 'mindmap'): void {
    history.save()
    applyAutoLayout(rootRef(), type)
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

    if (node.customX != null && node.customY != null && savedCenter) {
      const isRoot = nodeId === rootRef().id
      const { w: baseW, h: baseH } = baseSize(isRoot)
      const newW = baseW * clamped
      const newH = baseH * clamped
      node.customX = savedCenter.cx - newW / 2
      node.customY = savedCenter.cy - newH / 2
    }

    touch()
  }

  function commitScale(
    nodeId: string,
    scale: number,
    savedCenter?: { cx: number; cy: number }
  ): void {
    const node = findNode(nodeId)
    if (!node) return

    history.save()

    const final = normalizeScale(scale)
    node.scale = final === NODE_SCALE.DEFAULT ? undefined : final

    if (node.customX != null && node.customY != null && savedCenter) {
      const isRoot = nodeId === rootRef().id
      const { w: baseW, h: baseH } = baseSize(isRoot)
      const newW = baseW * final
      const newH = baseH * final
      node.customX = savedCenter.cx - newW / 2
      node.customY = savedCenter.cy - newH / 2
    }

    touch()
  }

  // ─── Импорт Markdown в существующий узел ────────

  function importMarkdownIntoNode(
    nodeId: string,
    markdown: string
  ): number {
    const target = findNode(nodeId)
    if (!target) {
      console.warn(`[importMarkdown] Узел ${nodeId} не найден`)
      return 0
    }

    // ⚠️ Парсер мутирует imagesRef() во время работы.
    //   Снимок истории делаем ДО парсинга, чтобы undo откатил и картинки.
    //   Если парсер вернёт null — откатываем сами через undoStack
    //   (history.save уже сделан — значит, текущее состояние в undo-стеке).
    history.save()

    // Создаём обёртку-ref для parser API
    const images = imagesRef()
    const imagesWrapper = {
      get value() { return images },
      set value(_: typeof images) { /* no-op: парсер всегда мутирует push-ем */ }
    } as Ref<typeof images>

    const parsed = parseMarkdownToTree(markdown, imagesWrapper)
    if (!parsed) {
      console.warn('[importMarkdown] Markdown пуст или без заголовков')
      // Откатываем "пустой" снимок — делать undo корректно только если
      // стек не тронут другими операциями; здесь тронут только что нами.
      history.undo()
      return 0
    }

    target.text = parsed.text
    if (parsed.notes) target.notes = parsed.notes
    if (parsed.imageId) target.imageId = parsed.imageId

    for (const child of parsed.children) {
      target.children.push(child)
    }

    target.collapsed = false
    touch()

    return countNodes(parsed)
  }

  function countNodes(node: MindMapNode): number {
    let count = 1
    for (const child of node.children) {
      count += countNodes(child)
    }
    return count
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
    findNode,
    importMarkdownIntoNode
  }
}