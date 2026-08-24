<!-- embed/MindmapViewer.vue — root component for mindmap embed -->
<template>
  <div
    class="mindmap-viewer"
    :class="className"
    :style="containerStyle"
  >
    <EmbedCanvas
      v-if="rootNode"
      :root-node="rootNode"
      :layout-type="layout"
      :show-notes="showNotes"
      :show-images="showImages"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, type CSSProperties } from 'vue'
import type { MindMapNode } from '../src/entities/node'
import type { LayoutType } from '../src/features/layout/lib/types'
import { parseMarkdownToTree } from './lib/parse'
import EmbedCanvas from './components/EmbedCanvas.vue'

// ─── Props ─────────────────────────────────────

interface Props {
  markdown: string
  layout?: LayoutType
  showNotes?: boolean
  showImages?: boolean
  height?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'mindmap',
  showNotes: true,
  showImages: true,
  height: '500px',
  class: '',
})

// ─── Parse markdown → tree ─────────────────────

const rootNode = ref<MindMapNode | null>(null)

function parseMarkdown(value: string): void {
  if (!value?.trim()) {
    rootNode.value = null
    return
  }
  rootNode.value = parseMarkdownToTree(value)
}

parseMarkdown(props.markdown)

watch(() => props.markdown, parseMarkdown)

// ─── Derived ───────────────────────────────────

const className = computed(() => props.class || undefined)

const containerStyle = computed<CSSProperties>(() => ({
  height: props.height,
  width: '100%',
  border: '1px solid #e2e2e2',
  borderRadius: '12px',
  overflow: 'hidden',
  position: 'relative',
  background: '#fafafa',
}))
</script>

<style scoped>
.mindmap-viewer {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
