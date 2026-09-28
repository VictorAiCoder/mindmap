<!-- src/embed/MindmapViewer.vue — thin data-loading wrapper for mindmap embed -->
<template>
  <div
    class="mindmap-viewer"
    :class="props.class"
    :style="{ height: props.height ?? '600px' }"
  >
    <div v-if="isLoading" class="mindmap-viewer__loading">Загрузка…</div>

    <!-- Consumer supplies the canvas via the default slot -->
    <slot
      v-if="$slots.default"
      :root-node="rootNode"
      :image-pool="imagePool"
      :is-loading="isLoading"
    />

    <!-- Standalone fallback: render the embed canvas internally -->
    <MindMapCanvas
      v-else
      :api="embedApi"
      :embed="true"
      :show-notes="props.showNotes"
      :show-images="props.showImages"
      :preview-mode="props.previewMode"
      :image-pool="imagePool"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef, watch, provide } from 'vue'
import MindMapCanvas from './components/MindMapCanvas.vue'
import { useMindMapData } from './composables/useMindMapData'
import { useMindMapApi } from './composables/useMindMapApi'
import { mindMapKey } from './injection-keys'
import type { MindMapApi } from './types/mindmap-api'
import type { LayoutType } from './types'

interface Props {
  markdown?: string
  slug?: string
  api?: MindMapApi
  layout?: LayoutType
  showNotes?: boolean
  showImages?: boolean
  previewMode?: boolean
  allowFullscreen?: boolean
  maxDepth?: number
  height?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  showNotes: true,
  showImages: true,
  previewMode: false,
  allowFullscreen: false,
  class: '',
})

// ─── Data loading (slug -> /api/mindmap/{slug}, else markdown, else api) ───

const { rootNode, imagePool, isLoading } = useMindMapData({
  slug: toRef(props, 'slug'),
  markdown: toRef(props, 'markdown'),
  maxDepth: toRef(props, 'maxDepth'),
  api: toRef(props, 'api'),
})

// ─── Expose for parent (ArticleCard preview uses viewerRef.rootNode/imagePool) ───

defineExpose({ rootNode, imagePool, isLoading })

// ─── Provide API to descendants rendered by the consumer's slot ───

if (props.api) {
  provide(mindMapKey, props.api)
}

// ─── Standalone fallback canvas (used when no default slot is provided) ───

const embedApi = useMindMapApi(null, { persistence: false })

watch(
  rootNode,
  (rn) => {
    if (rn) embedApi.rootNode.value = rn
  },
  { immediate: true },
)
</script>

<style scoped>
.mindmap-viewer {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  position: relative;
}

.mindmap-viewer__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-dim, #555);
  font-size: 0.85rem;
}
</style>