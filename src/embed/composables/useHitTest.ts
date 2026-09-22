// embed/composables/useHitTest.ts
import type { ComputedRef, Ref } from 'vue'
import type { LayoutData } from '@features/layout'
import type { NodeDragApi } from './useNodeDrag'

interface PanZoomApi {
  screenToScene: (
    clientX: number,
    clientY: number,
    rect: DOMRect,
    bounds: LayoutData['bounds']
  ) => { x: number; y: number }
}

/**
 * Drop-target detection (hit-test) при drag'е узлов.
 *
 * Вынесен из MindMapCanvas.vue (Фаза 4 рефакторинга).
 * O(N) — пространственный индекс пока не оправдан (<200 узлов).
 *
 * @param layoutData - реактивные позиции узлов
 * @param panZoom    - API viewport (screenToScene)
 * @param nodeDrag   - API drag (setDropTarget, clearDropTarget, isInDragGroup)
 * @param wrapperRef - ref на canvas wrapper DOM-элемент
 */
export function useHitTest(
  layoutData: ComputedRef<LayoutData>,
  panZoom: PanZoomApi,
  nodeDrag: NodeDragApi,
  wrapperRef: Ref<HTMLElement | null>,
) {
  /** Толерантность прицела при поиске drop-target'а (в координатах сцены, px). */
  const HIT_PADDING = 8

  function updateDropTarget(e: MouseEvent): void {
    const wrapper = wrapperRef.value
    if (!wrapper) return

    const rect = wrapper.getBoundingClientRect()
    const bounds = layoutData.value.bounds
    const world = panZoom.screenToScene(e.clientX, e.clientY, rect, bounds)

    let found: string | null = null

    for (const pos of layoutData.value.positions) {
      if (nodeDrag.isInDragGroup(pos.id)) continue

      if (
        world.x >= pos.x - HIT_PADDING &&
        world.x <= pos.x + pos.w + HIT_PADDING &&
        world.y >= pos.y - HIT_PADDING &&
        world.y <= pos.y + pos.h + HIT_PADDING
      ) {
        found = pos.id
        break
      }
    }

    if (found) nodeDrag.setDropTarget(found)
    else nodeDrag.clearDropTarget()
  }

  return { updateDropTarget }
}
