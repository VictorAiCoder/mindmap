import type { MindMapNode } from '@entities/node'
import type { RawImage } from '@entities/image'
import type { TreeCore } from './useTreeCore'
import type { HistoryApi } from '../types/history'

export interface NodeImagesApi {
  setNodeImage: (nodeId: string, dataUrl: string) => void
  setNodeImageById: (nodeId: string, imageId: string) => void
  removeNodeImage: (nodeId: string) => void
  setImageWidth: (nodeId: string, width: number) => void
  commitImageResize: (nodeId: string, width: number) => void
  renameImage: (imageId: string, name: string) => void
  deleteImageWithDetach: (imageId: string) => number
  purgeUnusedImages: () => number
  findImageUsages: (imageId: string) => string[]
}

// ─── Module-level helpers ────────────────────────────

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

function detachImageFromTree(root: MindMapNode, targetId: string): number {
  let count = 0
  function walk(node: MindMapNode): void {
    if (node.imageId === targetId) {
      node.imageId = null
      count++
    }
    for (const child of node.children) walk(child)
  }
  walk(root)
  return count
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

// ─── Composable ──────────────────────────────────────

export function useNodeImages(core: TreeCore, history: HistoryApi): NodeImagesApi {
  const { rootRef, imagesRef, findNode, touch } = core

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
   * Цепляет к узлу существующую картинку из пула.
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
   * Переименование картинки в пуле с записью в историю.
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

  function deleteImageWithDetach(imageId: string): number {
    const arr = imagesRef()
    const idx = arr.findIndex((i) => i.id === imageId)
    if (idx === -1) return 0

    history.save()

    // 1) Снимаем ссылку со всех узлов, считаем сколько отцепили
    const detachedCount = detachImageFromTree(rootRef(), imageId)

    // 2) Удаляем из пула
    arr.splice(idx, 1)

    touch()
    return detachedCount
  }

  /**
   * Удаляет неиспользуемые картинки. Если удалять нечего —
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

  // ─── Поиск ──────────────────────────────────────

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
    setNodeImage,
    setNodeImageById,
    removeNodeImage,
    setImageWidth,
    commitImageResize,
    renameImage,
    deleteImageWithDetach,
    purgeUnusedImages,
    findImageUsages
  }
}
