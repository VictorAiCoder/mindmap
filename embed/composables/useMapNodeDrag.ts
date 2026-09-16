import { ref, onBeforeUnmount } from 'vue'

/**
 * Encapsulates drag initiation for MapNode with unmount safety.
 *
 * Fixes:
 * - No cleanup on unmount: if parent removes node during drag, state leaks
 * - Guard against events after unmount
 *
 * @example
 * const { isDragging, onMouseDown } = useMapNodeDrag(emit)
 * // template: @mousedown.stop="onMouseDown"
 */
export function useMapNodeDrag(emit: {
  (e: 'startDrag', event: MouseEvent): void
}): {
  isDragging: import('vue').Ref<boolean>
  onMouseDown: (e: MouseEvent) => void
} {
  const isDragging = ref(false)
  let isUnmounted = false

  function onMouseDown(e: MouseEvent): void {
    if (isUnmounted || e.button !== 0) return
    isDragging.value = true
    emit('startDrag', e)
  }

  onBeforeUnmount(() => {
    isUnmounted = true
    isDragging.value = false
  })

  return { isDragging, onMouseDown }
}
