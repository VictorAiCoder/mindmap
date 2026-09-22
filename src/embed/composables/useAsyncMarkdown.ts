import { ref, watch, onBeforeUnmount, type Ref } from 'vue'
import { renderMarkdown } from '../lib/markdown'
import { renderMermaidInHtml } from '../lib/mermaid'

/**
 * Async markdown rendering with race condition protection.
 *
 * Watches `source` ref and re-renders when it changes.
 * Uses AbortController to cancel stale renders — if source changes
 * before the previous render completes, the old result is discarded.
 *
 * @example
 * const { renderedHtml } = useAsyncMarkdown(notes)
 */
export function useAsyncMarkdown(source: Ref<string>): {
  renderedHtml: Ref<string>
} {
  const renderedHtml = ref('')
  let abortController: AbortController | null = null

  watch(source, async (val) => {
    // Cancel any in-flight render
    abortController?.abort()
    const controller = new AbortController()
    abortController = controller

    const md = renderMarkdown(val)
    const html = await renderMermaidInHtml(md)

    // Only apply if this render wasn't aborted
    if (!controller.signal.aborted) {
      renderedHtml.value = html
    }
  }, { immediate: true })

  onBeforeUnmount(() => {
    abortController?.abort()
  })

  return { renderedHtml }
}
