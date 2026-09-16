import { ref, computed, watch, onBeforeUnmount, type Ref } from 'vue'

const MIN_WIDTH = 100
const MAX_WIDTH = 1000
const DEFAULT_WIDTH = 160

interface ResizeEmit {
  (e: 'resize', width: number): void
  (e: 'resize-commit', width: number): void
}

/**
 * Encapsulates image resize logic with proper listener cleanup.
 *
 * Fixes:
 * - Listener leak: single `cleanup()` function removes all window listeners
 * - mouseleave: `forceCommit()` ends resize if cursor leaves the container
 * - Watch → computed: uses computed for external width sync instead of watch mutation
 *
 * @example
 * const { liveWidth, isResizing, onMouseDown, onTouchStart, onMouseLeave } = useImageResize(
 *   { imageWidth: toRef(props, 'imageWidth'), scale: toRef(props, 'scale'), aspectRatio },
 *   emit
 * )
 */
export function useImageResize(
  options: {
    imageWidth: Ref<number | null>
    scale: Ref<number>
    aspectRatio: Ref<number>
  },
  emit: ResizeEmit
) {
  const liveWidth = ref<number>(options.imageWidth.value ?? DEFAULT_WIDTH)
  const isResizing = ref(false)

  const startX = ref(0)
  const startY = ref(0)
  const startWidth = ref(0)

  // Computed sync: props.imageWidth → liveWidth (only when not resizing)
  const externalWidth = computed(() => options.imageWidth.value ?? DEFAULT_WIDTH)
  watch(externalWidth, (val) => {
    if (!isResizing.value) {
      liveWidth.value = val
    }
  })

  // ─── Core resize logic ────────────────────────

  function updateSize(clientX: number, clientY: number): void {
    const dx = clientX - startX.value
    const dy = clientY - startY.value
    const ratio = options.aspectRatio.value || 0.75
    const scaleVal = options.scale.value || 1

    const delta = (dx + dy / ratio) / 2 / scaleVal

    let newW = startWidth.value + delta
    newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(newW)))

    liveWidth.value = newW
    emit('resize', newW)
  }

  // ─── Mouse handlers ───────────────────────────

  function onMouseMove(e: MouseEvent): void {
    updateSize(e.clientX, e.clientY)
  }

  function onMouseUp(): void {
    cleanup()
    commit()
  }

  function onMouseDown(e: MouseEvent): void {
    isResizing.value = true
    startX.value = e.clientX
    startY.value = e.clientY
    startWidth.value = displayWidth()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // ─── Touch handlers ───────────────────────────

  function onTouchMove(e: TouchEvent): void {
    e.preventDefault()
    if (!e.touches.length) return
    updateSize(e.touches[0].clientX, e.touches[0].clientY)
  }

  function onTouchEnd(): void {
    cleanup()
    commit()
  }

  function onTouchStart(e: TouchEvent): void {
    if (!e.touches.length) return
    isResizing.value = true
    startX.value = e.touches[0].clientX
    startY.value = e.touches[0].clientY
    startWidth.value = displayWidth()

    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)
  }

  // ─── Helpers ──────────────────────────────────

  function displayWidth(): number {
    return options.imageWidth.value ?? DEFAULT_WIDTH
  }

  function commit(): void {
    isResizing.value = false
    const finalWidth = Math.round(liveWidth.value)
    emit('resize-commit', finalWidth)
  }

  /**
   * Force-commit when mouse leaves the container during resize.
   */
  function forceCommit(): void {
    if (!isResizing.value) return
    cleanup()
    commit()
  }

  /**
   * Single cleanup function — removes ALL window listeners.
   * Called by onMouseUp, onTouchEnd, forceCommit, and onBeforeUnmount.
   */
  function cleanup(): void {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('touchcancel', onTouchEnd)
  }

  onBeforeUnmount(cleanup)

  return {
    liveWidth,
    isResizing,
    onMouseDown,
    onTouchStart,
    onMouseLeave: forceCommit,
    cleanup,
  }
}
