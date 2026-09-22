import { ref, computed, onBeforeUnmount, type Ref, type ComputedRef } from 'vue'

/**
 * Manages hover-based expansion state with automatic timer cleanup.
 *
 * Returns a computed `isExpanded` that is `true` when either:
 * - `pinned` is true (always expanded), OR
 * - mouse has been hovering for `delay` ms while `enabled` is true
 *
 * @example
 * const { isExpanded, onMouseEnter, onMouseLeave } = useHoverExpansion({
 *   enabled: visible,
 *   pinned,
 *   delay: 300,
 * })
 */
export function useHoverExpansion(options: {
  /** Whether hover expansion is allowed (e.g. notesVisible) */
  enabled: Ref<boolean>
  /** Whether the item is pinned (always expanded when true) */
  pinned: Ref<boolean>
  /** Hover delay in ms before expanding (default: 300) */
  delay?: number
}): {
  isExpanded: ComputedRef<boolean>
  onMouseEnter: () => void
  onMouseLeave: () => void
} {
  const isHovered = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  const isExpanded = computed(() => options.pinned.value || isHovered.value)

  function onMouseEnter(): void {
    if (!options.enabled.value || options.pinned.value) return
    timer = setTimeout(() => {
      isHovered.value = true
    }, options.delay ?? 300)
  }

  function onMouseLeave(): void {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!options.pinned.value) {
      isHovered.value = false
    }
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })

  return { isExpanded, onMouseEnter, onMouseLeave }
}
