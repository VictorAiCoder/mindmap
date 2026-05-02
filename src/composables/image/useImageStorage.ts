// src/composables/image/useImageStorage.ts
import { computed, type Ref } from 'vue'
import type {
  MindMapNode,
  StoredImage,
  RawImage,
} from '@/types/mindmap'
import type { ImageStorageApi, ResolvedImage } from '@/types/mindmap-api'

// ─── Helpers ────────────────────────────────────────

function generateImageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `img_${crypto.randomUUID()}`
  }
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Рекурсивно собирает все imageId, используемые в дереве.
 */
function collectUsedImageIds(root: MindMapNode, acc: Map<string, string[]>): void {
  if (root.imageId) {
    const list = acc.get(root.imageId) ?? []
    list.push(root.id)
    acc.set(root.imageId, list)
  }
  for (const child of root.children) {
    collectUsedImageIds(child, acc)
  }
}

// ─── Composable ─────────────────────────────────────

/**
 * Управление пулом картинок документа.
 *
 * Контракт:
 *   - НЕ триггерит history сама по себе — вызывающий код
 *     должен делать history.save() до мутаций, если нужен undo.
 *   - resolve — чистая функция, безопасно звать в computed.
 */
export function useImageStorage(
  images: Ref<StoredImage[]>,
  root: Ref<MindMapNode>
): ImageStorageApi {

  function findById(id: string): StoredImage | null {
    return images.value.find((img) => img.id === id) ?? null
  }

  function resolve(id: string | null | undefined): ResolvedImage | null {
    if (!id) return null
    const img = findById(id)
    if (!img) return null

    if (img.kind === 'raw') {
      return { id: img.id, dataUrl: img.dataUrl }
    }

    // segment: ищем исходник
    const source = findById(img.sourceId)
    if (!source || source.kind !== 'raw') {
      // битая ссылка на источник
      return null
    }
    return {
      id: img.id,
      dataUrl: source.dataUrl,
      clip: img.clip,
    }
  }

  function addRaw(dataUrl: string, name?: string): string {
    const newImage: RawImage = {
      kind: 'raw',
      id: generateImageId(),
      dataUrl,
      createdAt: Date.now(),
      ...(name ? { name } : {}),
    }
    images.value.push(newImage)
    return newImage.id
  }

  function remove(id: string): void {
    const idx = images.value.findIndex((img) => img.id === id)
    if (idx >= 0) images.value.splice(idx, 1)
  }

  function findUsages(id: string): string[] {
    const map = new Map<string, string[]>()
    collectUsedImageIds(root.value, map)
    return map.get(id) ?? []
  }

  // read-only обёртка для экспорта
  const readOnlyImages = computed(() => images.value as readonly StoredImage[])

  return {
    images: readOnlyImages,
    resolve,
    addRaw,
    remove,
    findUsages,
  }
}