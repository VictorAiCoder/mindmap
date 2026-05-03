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

  const rootRef = () => document.value.root
  const imagesRef = () => document.value.images

  function touch(): void {
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

  // ─── Картинки: установка ────────────────────────

  /**
   * Устанавливает картинку узла: создаёт запись в пуле и сохраняет imageId.
   *
   * Политика: старая картинка (если была) в пуле НЕ удаляется.
   * Причины:
   *   1) undo/redo — нужна возможность вернуться к предыдущей;
   *   2) картинка может использоваться другими узлами.
   * Чистка неиспользуемых — через галерею (Коммит 2a)
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

  /**
   * ★ НОВОЕ: Цепляет к узлу существующую картинку из пула.
   *
   * В отличие от setNodeImage — не создаёт новую запись.
   * Используется галереей при drag'n'drop существующей картинки на узел.
   */
  function setNodeImageById(nodeId: string, imageId: string): void {
    const node = findNode(nodeId)
    if (!node) return

    const exists = imagesRef().some((img) => img.id === imageId)
    if (!exists) {
      console.warn(`[setNodeImageById] картинка ${imageId} не найдена в пуле`)
      return
    }

    // No-op: уже стоит эта же картинка — экономим snapshot
    if (node.imageId === imageId) return

    history.save()
    node.imageId = imageId
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

  // ─── Картинки: операции галереи ─────────────────

  /**
   * ★ НОВОЕ: Переименование картинки в пуле с записью в историю.
   * Пустое имя или такое же — игнорируются (no-op).
   */
  function renameImage(imageId: string, name: string): void {
    const trimmed = name.trim()
    if (!trimmed) return

    const img = imagesRef().find((i) => i.id === imageId)
    if (!img || img.name === trimmed) return

    history.save()
    img.name = trimmed
    touch()
  }

  /**
   * ★ НОВОЕ: Удаление картинки из пула с обнулением imageId
   *   во всех узлах, где она использовалась.
   *
   * Если картинки нет в пуле — no-op.
   */
  function deleteImageWithDetach(imageId: string): number | void {
    const arr = imagesRef()
    const idx = arr.findIndex((i) => i.id === imageId)
    if (idx === -1) return

    history.save()

    // 1) Снимаем ссылку со всех узлов
    detachImageFromTree(rootRef(), imageId)

    // 2) Удаляем из пула (мутация in-place)
    arr.splice(idx, 1)

    touch()
  }

  /**
   * ★ НОВОЕ: Удаляет неиспользуемые картинки. Если удалять нечего —
   *   историю не трогает. Возвращает число удалённых.
   */
  function purgeUnusedImages(): number {
    const arr = imagesRef()
    if (arr.length === 0) return 0

    const used = collectUsedImageIds(rootRef())

    // Собираем индексы неиспользуемых (с конца, чтобы splice был безопасен)
    const toRemove: number[] = []
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!used.has(arr[i].id)) toRemove.push(i)
    }
    if (toRemove.length === 0) return 0

    history.save()
    for (const i of toRemove) arr.splice(i, 1)
    touch()
    return toRemove.length
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

    history.save()

    const images = imagesRef()
    const imagesWrapper = {
      get value() { return images },
      set value(_: typeof images) { /* no-op */ }
    } as Ref<typeof images>

    const parsed = parseMarkdownToTree(markdown, imagesWrapper)
    if (!parsed) {
      console.warn('[importMarkdown] Markdown пуст или без заголовков')
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

    /**
   * Возвращает id узлов, использующих данную картинку.
   * Не мутирует, не пишет в историю.
   */
  function findImageUsages(imageId: string): string[] {
    const root = rootRef()
    if (!root) return []
    const result: string[] = []
    const stack: MindMapNode[] = [root]
    while (stack.length) {
      const n = stack.pop()!
      if (n.imageId === imageId) result.push(n.id)
      if (n.children) stack.push(...n.children)
    }
    return result
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
    setNodeImageById,        // ★ новое
    removeNodeImage,
    setImageWidth,
    commitImageResize,
    renameImage,             // ★ новое
    deleteImageWithDetach,   // ★ новое
    purgeUnusedImages,       // ★ новое
    resetAllPositions,
    autoLayout,
    reparentNode,
    moveNodeGroup,
    updateScale,
    commitScale,
    findNode,
    importMarkdownIntoNode,
    findImageUsages
  }
}

// ─── Локальные хелперы (не экспортируем) ───────────

/**
 * Рекурсивно обнуляет node.imageId, если он совпадает с targetId.
 * Использует обход in-place, не создавая новых объектов.
 */
function detachImageFromTree(root: MindMapNode, targetId: string): void {
  function walk(node: MindMapNode): void {
    if (node.imageId === targetId) node.imageId = null
    for (const child of node.children) walk(child)
  }
  walk(root)
}

/**
 * Собирает Set всех imageId, используемых в дереве.
 */
function collectUsedImageIds(root: MindMapNode): Set<string> {
  const used = new Set<string>()
  function walk(node: MindMapNode): void {
    if (node.imageId) used.add(node.imageId)
    for (const child of node.children) walk(child)
  }
  walk(root)
  return used
}