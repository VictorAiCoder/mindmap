// src/composables/image/useSegmentOperations.ts
import type { Ref } from 'vue'
import { triggerRef } from 'vue'
import type { MindMapDocument } from '@entities/mindmap'
import type { HistoryApi, ImageStorageApi } from '@/types/mindmap-api'

/**
 * History-aware операции над сегментами.
 *
 * Паттерн live/commit идентичен updateScale/commitScale в useTreeOperations:
 * live-операции мутируют состояние без истории (для drag-preview),
 * commit-операции пишут историю один раз — в конце жеста.
 */
export interface SegmentOperationsApi {
  addSegment(
    sourceId: string,
    clip: { x: number; y: number; w: number; h: number },
    name?: string
  ): string | null

  updateSegmentLive(
    id: string,
    patch: Partial<{
      clip: { x: number; y: number; w: number; h: number }
      name: string
    }>
  ): void

  commitSegment(
    id: string,
    patch: Partial<{
      clip: { x: number; y: number; w: number; h: number }
      name: string
    }>
  ): void

  deleteSegment(id: string): void
  renameSegment(id: string, name: string): void
}

const MIN_CLIP = 0.01

export function useSegmentOperations(
  document: Ref<MindMapDocument>,
  history: HistoryApi,
  storage: ImageStorageApi
): SegmentOperationsApi {

  function touch(): void {
    triggerRef(document)
  }

  /** Pre-check: можно ли создать сегмент с такими параметрами. */
  function canCreateSegment(
    sourceId: string,
    clip: { x: number; y: number; w: number; h: number }
  ): boolean {
    const source = storage.images.value.find((i) => i.id === sourceId)
    if (!source || source.kind !== 'raw') return false

    const x = Math.max(0, Math.min(1, clip.x))
    const y = Math.max(0, Math.min(1, clip.y))
    const w = Math.max(0, Math.min(1 - x, clip.w))
    const h = Math.max(0, Math.min(1 - y, clip.h))
    return w >= MIN_CLIP && h >= MIN_CLIP
  }

  function addSegment(
    sourceId: string,
    clip: { x: number; y: number; w: number; h: number },
    name?: string
  ): string | null {
    if (!canCreateSegment(sourceId, clip)) return null

    history.save()
    const id = storage.addSegment(sourceId, clip, name)
    if (id === null) {
      console.warn('[useSegmentOperations] addSegment: storage rejected after pre-check')
      return null
    }
    touch()
    return id
  }

  function updateSegmentLive(
    id: string,
    patch: Partial<{
      clip: { x: number; y: number; w: number; h: number }
      name: string
    }>
  ): void {
    storage.updateSegment(id, patch)
    touch()
  }

  function commitSegment(
    id: string,
    patch: Partial<{
      clip: { x: number; y: number; w: number; h: number }
      name: string
    }>
  ): void {
    history.save()
    storage.updateSegment(id, patch)
    touch()
  }

  function deleteSegment(id: string): void {
    const exists = storage.images.value.some((i) => i.id === id)
    if (!exists) return
    history.save()
    storage.remove(id)
    touch()
  }

  function renameSegment(id: string, name: string): void {
    const trimmed = name.trim()
    const img = storage.images.value.find((i) => i.id === id)
    if (!img) return
    if (img.kind !== 'segment') {
      console.warn('[useSegmentOperations] renameSegment: target is not a segment')
      return
    }
    if (img.name === trimmed) return

    history.save()
    storage.updateSegment(id, { name: trimmed })
    touch()
  }

  return {
    addSegment,
    updateSegmentLive,
    commitSegment,
    deleteSegment,
    renameSegment,
  }
}