// embed/composables/useMindMapData.ts
import { ref, computed, watch, onMounted, type Ref } from 'vue'
import type { MindMapNode } from '@entities/node'
import type { StoredImage } from '@entities/image'
import type { MindMapApi } from '../types/mindmap-api'
import { parseMarkdownToTree } from '../lib/parse'
import { processTree } from '../lib/treeManipulators'
import { readApiRef } from '../lib/readApiRef'

declare const $fetch: <T = any>(url: string, options?: any) => Promise<T>

export interface UseMindMapDataOptions {
  slug?: Ref<string | undefined>
  markdown?: Ref<string | undefined>
  maxDepth?: Ref<number | undefined>
  api?: Ref<MindMapApi | undefined>
}

export interface UseMindMapDataReturn {
  rootNode: Ref<MindMapNode | null>
  imagePool: Ref<StoredImage[]>
  isLoading: Ref<boolean>
}

/**
 * Загрузка и обработка данных mindmap.
 *
 * Вынесен из MindmapViewer.vue (Фаза 2 рефакторинга).
 * Устраняет DRY-нарушение: loading pipeline (loadFromApi + parseMarkdown)
 * дублировался в onMounted и watch(slug).
 *
 * @example
 * ```ts
 * const { rootNode, imagePool, isLoading } = useMindMapData({
 *   slug: toRef(props, 'slug'),
 *   markdown: toRef(props, 'markdown'),
 *   maxDepth: toRef(props, 'maxDepth'),
 * })
 * ```
 */
export function useMindMapData(options: UseMindMapDataOptions): UseMindMapDataReturn {
  const { slug, markdown, maxDepth, api } = options

  // ─── API mode: use provided API directly ───────
  if (api) {
    // The API may be raw (ref field), a reactive proxy (auto-unwrapped), or a
    // hand-built `{ value }` carrier — readApiRef normalises all three.
    const rootNode = computed(
      () => readApiRef<MindMapNode>(api.value?.rootNode) ?? null
    ) as Ref<MindMapNode | null>
    const imagePool = ref<StoredImage[]>([]) as Ref<StoredImage[]>
    const isLoading = ref(false)
    return { rootNode, imagePool, isLoading }
  }

  // ─── Load mode: fetch from API or parse markdown ──
  const rootNode = ref<MindMapNode | null>(null) as Ref<MindMapNode | null>
  const imagePool = ref<StoredImage[]>([]) as Ref<StoredImage[]>
  const isLoading = ref(false)

  async function loadFromApi(slugValue: string): Promise<boolean> {
    try {
      const doc = await $fetch<{ root?: MindMapNode; images?: StoredImage[] }>(
        `/api/mindmap/${slugValue}`,
      )
      if (doc?.root) {
        if (doc.images?.length) {
          imagePool.value = doc.images
        }
        processTree(doc.root, { maxDepth: maxDepth?.value })
        rootNode.value = doc.root
        return true
      }
    } catch (err) {
      console.error('[MindmapViewer] loadFromApi error:', err)
    }
    return false
  }

  function parseMarkdown(value: string): void {
    if (!value?.trim()) {
      rootNode.value = null
      return
    }
    const tree = parseMarkdownToTree(value, imagePool)
    if (tree) {
      processTree(tree, { maxDepth: maxDepth?.value })
    }
    rootNode.value = tree
  }

  async function loadOrParse(slugValue: string, markdownValue?: string): Promise<void> {
    isLoading.value = true
    const loaded = await loadFromApi(slugValue)
    if (!loaded && markdownValue) {
      parseMarkdown(markdownValue)
    }
    isLoading.value = false
  }

  onMounted(async () => {
    const slugVal = slug?.value
    const mdVal = markdown?.value
    if (slugVal) {
      await loadOrParse(slugVal, mdVal)
    } else if (mdVal) {
      parseMarkdown(mdVal)
    }
  })

  if (slug) {
    watch(slug, async (newSlug) => {
      if (newSlug) {
        await loadOrParse(newSlug, markdown?.value)
      }
    })
  }

  if (markdown) {
    watch(markdown, (md) => {
      if (!slug?.value && md) {
        parseMarkdown(md)
      }
    })
  }

  return { rootNode, imagePool, isLoading }
}