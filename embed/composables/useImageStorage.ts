import { computed, type Ref, type ComputedRef } from 'vue'
import type { ImageStorageApi, ResolvedImage } from '../types/image-storage'
import type { StoredImage, ImageSegment, Clip } from '@entities/image'

/**
 * Генератор ID для картинок.
 * Формат: <prefix>_<uuid> или <prefix>_<timestamp>_<random> (fallback).
 */
function generateId(prefix: 'img' | 'seg'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Зажимает clip в [0..1] и отбраковывает вырожденные прямоугольники.
 * Сегмент меньше 1% по любой из сторон считается невалидным.
 */
function sanitizeClip(clip: Clip): Clip | null {
  const x = Math.max(0, Math.min(1, clip.x))
  const y = Math.max(0, Math.min(1, clip.y))
  const w = Math.max(0, Math.min(1 - x, clip.w))
  const h = Math.max(0, Math.min(1 - y, clip.h))
  if (w < 0.01 || h < 0.01) return null
  return { x, y, w, h }
}

/**
 * "Тупой" CRUD пула картинок (raw + segments).
 *
 * Принципы:
 * - Не знает про дерево — методы с обходом узлов живут в useTreeOperations.
 * - Не пишет в историю — вызывающий код решает, нужно ли save() до мутации.
 * - Использует прямую мутацию массива (push/splice), как и весь остальной
 *   код проекта. Vue 3 ловит мутации через Proxy.
 */
export function useImageStorage(
  imagesRef: Ref<StoredImage[]>
): ImageStorageApi {

  // ─── Чтение ─────────────────────────────────

  function resolve(id: string | null | undefined): ResolvedImage | null {
    if (!id) return null
    const img = imagesRef.value.find(i => i.id === id)
    if (!img) return null

    if (img.kind === 'raw') {
      return { id: img.id, dataUrl: img.dataUrl }
    }

    // Сегмент → резолвим источник
    if (img.kind === 'segment') {
      const source = imagesRef.value.find(i => i.id === img.sourceId)
      // Orphan: источник удалён или не raw — MVP-поведение: null
      if (!source || source.kind !== 'raw') {
        return null
      }
      return {
        id: img.id,
        dataUrl: source.dataUrl,
        clip: { ...img.clip }
      }
    }

    return null
  }

  function listSegmentsOf(sourceId: string): readonly ImageSegment[] {
    return imagesRef.value.filter(
      (img): img is ImageSegment =>
        img.kind === 'segment' && img.sourceId === sourceId
    )
  }

  // ─── Добавление ─────────────────────────────

  function addRaw(dataUrl: string, name?: string): string {
    const id = generateId('img')
    const finalName = name?.trim() || generateDefaultName()

    const newImage: StoredImage = {
      kind: 'raw',
      id,
      dataUrl,
      name: finalName,
      createdAt: Date.now()
    }

    imagesRef.value.push(newImage)
    return id
  }

  function addSegment(
    sourceId: string,
    clip: Clip,
    name?: string
  ): string | null {
    // 1. Источник должен существовать
    const source = imagesRef.value.find(img => img.id === sourceId)
    if (!source) {
      console.warn(`[useImageStorage] addSegment: source ${sourceId} not found`)
      return null
    }
    // 2. Источник должен быть raw (не сегмент сегмента)
    if (source.kind !== 'raw') {
      console.warn(`[useImageStorage] addSegment: source must be raw, got ${source.kind}`)
      return null
    }
    // 3. Валидируем clip
    const safeClip = sanitizeClip(clip)
    if (!safeClip) {
      console.warn(`[useImageStorage] addSegment: clip too small or invalid`)
      return null
    }

    const id = generateId('seg')
    const segment: ImageSegment = {
      kind: 'segment',
      id,
      sourceId,
      clip: safeClip,
      name: name?.trim() || undefined,
      createdAt: Date.now()
    }
    imagesRef.value.push(segment)
    return id
  }

  /**
   * Имя по умолчанию вида "Картинка N", где N — следующий после максимального.
   * ⚠️ Сканирует только raw, не сегменты (у сегментов другой нейминг).
   */
  function generateDefaultName(): string {
    const pattern = /^Картинка (\d+)$/
    let maxN = 0
    for (const img of imagesRef.value) {
      if (img.kind !== 'raw') continue
      const m = img.name?.match(pattern)
      if (m) {
        const n = parseInt(m[1], 10)
        if (n > maxN) maxN = n
      }
    }
    return `Картинка ${maxN + 1}`
  }

  // ─── Переименование ─────────────────────────

  function rename(id: string, name: string): void {
    const trimmed = name.trim()
    if (!trimmed) return
    const img = imagesRef.value.find(i => i.id === id)
    if (!img || img.name === trimmed) return
    img.name = trimmed
  }

  // ─── Обновление сегмента ────────────────────

  function updateSegment(
    id: string,
    patch: Partial<{
      clip: Clip
      name: string
    }>
  ): void {
    const img = imagesRef.value.find(i => i.id === id)
    if (!img) return
    if (img.kind !== 'segment') {
      console.warn(`[useImageStorage] updateSegment: ${id} is not a segment`)
      return
    }
    if (patch.clip) {
      const safeClip = sanitizeClip(patch.clip)
      if (safeClip) img.clip = safeClip
    }
    if (patch.name !== undefined) {
      const trimmed = patch.name.trim()
      img.name = trimmed || undefined
    }
  }

  // ─── Удаление ───────────────────────────────

  function remove(id: string): void {
    const target = imagesRef.value.find(i => i.id === id)
    if (!target) return

    if (target.kind === 'raw') {
      // Каскадно удаляем raw и все его сегменты.
      // splice in-place, чтобы не терять реактивность на других ссылках.
      for (let i = imagesRef.value.length - 1; i >= 0; i--) {
        const img = imagesRef.value[i]
        if (img.id === id) {
          imagesRef.value.splice(i, 1)
        } else if (img.kind === 'segment' && img.sourceId === id) {
          imagesRef.value.splice(i, 1)
        }
      }
    } else {
      // Сегмент — удаляем только его
      const idx = imagesRef.value.findIndex(i => i.id === id)
      if (idx !== -1) imagesRef.value.splice(idx, 1)
    }
  }

  // ─── Computed ───────────────────────────────

  const images = computed<readonly StoredImage[]>(() => imagesRef.value)
  const totalCount = computed(() => imagesRef.value.length)

  return {
    images,
    resolve,
    addRaw,
    rename,
    remove,
    totalCount,
    addSegment,
    updateSegment,
    listSegmentsOf
  }
}
