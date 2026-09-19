// embed/composables/usePositionIndex.ts
import { computed, type ComputedRef } from 'vue'
import type { LayoutData, LayoutPosition, PositionMap } from '@features/layout'

/**
 * Мемоизированный индекс позиций узлов на канвасе.
 *
 * Заменяет 4 дублирующих new Map() в MindMapCanvas.vue:
 *  - posById (O(1) lookup по id)
 *  - rootPos (корневой узел)
 *  - toPositionMap (для useNodeDrag.finishDrag)
 *
 * @example
 * ```ts
 * const { posById, rootPos, toPositionMap } = usePositionIndex(layoutData)
 * // posById.value.get(nodeId) → LayoutPosition | undefined
 * // rootPos.value → LayoutPosition | null
 * // toPositionMap() → PositionMap (вызывается при finishDrag)
 * ```
 */
export function usePositionIndex(layoutData: ComputedRef<LayoutData>) {
  /**
   * Индекс позиций по id для O(1) поиска.
   * Используется при handleDelete / startEdit / handleHighlightFromGallery.
   * Пересобирается при каждом изменении layoutData — обычно редко.
   */
  const posById = computed<Map<string, LayoutPosition>>(() => {
    const map = new Map<string, LayoutPosition>()
    for (const pos of layoutData.value.positions) {
      map.set(pos.id, pos)
    }
    return map
  })

  /** Корневой узел дерева (depth === 0). */
  const rootPos = computed<LayoutPosition | null>(() => {
    for (const pos of layoutData.value.positions) {
      if (pos.depth === 0) return pos
    }
    return null
  })

  /**
   * Строит PositionMap из текущих позиций.
   * Вызывается в момент finishDrag для передачи актуальных координат
   * узлам без customX/Y.
   */
  function toPositionMap(): PositionMap {
    const map: PositionMap = new Map()
    for (const pos of layoutData.value.positions) {
      map.set(pos.id, { x: pos.x, y: pos.y })
    }
    return map
  }

  return { posById, rootPos, toPositionMap }
}
