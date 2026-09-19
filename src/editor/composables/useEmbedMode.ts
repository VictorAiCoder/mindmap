// src/editor/composables/useEmbedMode.ts
import { ref } from 'vue'
import type { MindMapApi } from '../../../embed/types/mindmap-api'

/**
 * Suppresses URL.createObjectURL during export to prevent browser download dialog.
 */
function suppressExport<T>(fn: () => T): T {
  const original = URL.createObjectURL
  URL.createObjectURL = (() => '') as typeof URL.createObjectURL
  try {
    return fn()
  } finally {
    URL.createObjectURL = original
  }
}

/**
 * Embed mode composable — toggles between edit and preview modes.
 *
 * @example
 * ```ts
 * const { isEmbedMode, embedMarkdown, toggle } = useEmbedMode(mindmap)
 * toggle() // switch to embed mode
 * ```
 */
export function useEmbedMode(api: MindMapApi) {
  const isEmbedMode = ref(false)
  const embedMarkdown = ref('')

  function toggle(): void {
    if (!isEmbedMode.value) {
      embedMarkdown.value = suppressExport(() => api.exportTree('markdown'))
    }
    isEmbedMode.value = !isEmbedMode.value
  }

  return { isEmbedMode, embedMarkdown, toggle }
}
