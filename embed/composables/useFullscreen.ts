// embed/composables/useFullscreen.ts
import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Minimal fullscreen composable.
 *
 * Вынесен из MindmapViewer.vue (Фаза 3 рефакторинга).
 * Без state machine — просто ref + enter/exit + Escape listener + cleanup.
 *
 * @example
 * ```ts
 * const { isFullscreen, enter, exit } = useFullscreen()
 * // template: @click="enter"
 * ```
 */
export function useFullscreen() {
  const isFullscreen = ref(false)

  function enter(): void {
    isFullscreen.value = true
  }

  function exit(): void {
    isFullscreen.value = false
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && isFullscreen.value) {
      exit()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', onKeydown)
    if (isFullscreen.value) exit()
  })

  return { isFullscreen, enter, exit }
}
