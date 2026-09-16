import { ref, onBeforeUnmount, type Ref } from 'vue'

/**
 * Encapsulates hover state with debounce and menu-awareness.
 *
 * Fixes:
 * - Race condition: hover "flashes" when mouse moves quickly
 * - Menu awareness: hover doesn't reset while context menu is open
 * - Cleanup: timer cleared on unmount
 *
 * @example
 * const { isHovered, onMouseEnter, onMouseLeave } = useMapNodeHover({
 *   isMenuOpen: computed(() => activeMenuId.value === nodeId),
 * })
 */
export function useMapNodeHover(options: {
  /** Whether the context menu is currently open for this node */
  isMenuOpen: Ref<boolean>
}): {
  isHovered: import('vue').Ref<boolean>
  onMouseEnter: () => void
  onMouseLeave: () => void
} {
  const isHovered = ref(false)
  let hoverTimer: ReturnType<typeof setTimeout> | null = null

  function onMouseEnter(): void {
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      hoverTimer = null
    }
    isHovered.value = true
  }

  function onMouseLeave(): void {
    hoverTimer = setTimeout(() => {
      if (!options.isMenuOpen.value) {
        isHovered.value = false
      }
    }, 200)
  }

  onBeforeUnmount(() => {
    if (hoverTimer) clearTimeout(hoverTimer)
  })

  return { isHovered, onMouseEnter, onMouseLeave }
}
