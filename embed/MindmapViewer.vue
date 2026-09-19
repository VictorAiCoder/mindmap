<!-- embed/MindmapViewer.vue — data loader + fullscreen wrapper for mindmap embed -->
<template>
  <div
    class="mindmap-viewer"
    :class="viewerClasses"
    :style="viewerStyle"
  >
    <!-- Fullscreen toggle button -->
    <button
      v-if="allowFullscreen && !isFullscreen && !previewMode"
      class="mindmap-viewer__fs-btn"
      title="На весь экран"
      @click="enterFullscreen"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
    </button>

    <div v-if="isLoading" class="mindmap-viewer__loading">Загрузка…</div>

    <!-- Consumer passes canvas via slot (rendered once) -->
    <slot />

    <!-- Close button (fullscreen only) -->
    <button
      v-if="isFullscreen"
      class="mindmap-viewer__close-btn"
      title="Закрыть (Esc)"
      @click="exitFullscreen"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, toRef, type CSSProperties } from 'vue'
import type { MindMapNode } from '@entities/node'
import type { MindMapApi } from './types/mindmap-api'
import { embedSlotsKey, mindMapKey, type EmbedSlots } from './injection-keys'
import { useMindMapData } from './composables/useMindMapData'
import { useFullscreen } from './composables/useFullscreen'

// ─── Props ─────────────────────────────────────

interface Props {
  markdown?: string
  slug?: string
  showNotes?: boolean
  showImages?: boolean
  height?: string
  class?: string
  allowFullscreen?: boolean
  previewMode?: boolean
  api?: MindMapApi
  editMode?: boolean
  maxDepth?: number
}

const props = withDefaults(defineProps<Props>(), {
  showNotes: true,
  showImages: true,
  height: '500px',
  class: '',
  allowFullscreen: true,
  previewMode: false,
  editMode: false,
})

// ─── Slots ─────────────────────────────────────

const slots = defineSlots<{
  image?: (props: { node: MindMapNode; src: string; clip: any; isRoot: boolean; imageWidth: number | null; scale: number }) => any
  notes?: (props: { node: MindMapNode; notes: string; color: string; isExpanded: boolean; isLong: boolean }) => any
  menu?: (props: { node: MindMapNode; isRoot: boolean; isLeaf: boolean; hasNotes: boolean; hasChildren: boolean; hasImage: boolean }) => any
  default?: () => any
}>()

// ─── Provide slots to descendants ──────────────

const embedSlots: EmbedSlots = {
  image: slots.image ?? undefined,
  notes: slots.notes ?? undefined,
  menu: slots.menu ?? undefined,
}
provide(embedSlotsKey, embedSlots)

if (props.api) {
  provide(mindMapKey, props.api)
}

// ─── Fullscreen injection ──────────────────────

const { isFullscreen, enter: enterFullscreen, exit: exitFullscreen } = useFullscreen()

// ─── Data loading ──────────────────────────────

const { rootNode, imagePool, isLoading } = useMindMapData({
  slug: toRef(props, 'slug'),
  markdown: toRef(props, 'markdown'),
  maxDepth: toRef(props, 'maxDepth'),
  api: toRef(props, 'api'),
})

// ─── Expose for parent ─────────────────────────

defineExpose({ rootNode, imagePool, isLoading, isFullscreen, enterFullscreen, exitFullscreen })

// ─── Derived ───────────────────────────────────

const viewerClasses = computed(() => ({
  'mindmap-viewer--fullscreen': isFullscreen.value,
  [props.class || '']: !!props.class,
}))

const viewerStyle = computed<CSSProperties>(() => ({
  height: props.height,
}))
</script>

<style scoped>
.mindmap-viewer {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  position: relative;
}

.mindmap-viewer--fullscreen {
  position: fixed !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  border: none !important;
  border-radius: 0 !important;
  z-index: 9999;
}

.mindmap-viewer__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-dim, #555);
  font-size: 0.85rem;
}

/* Fullscreen toggle button */
.mindmap-viewer__fs-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border, #222);
  border-radius: var(--radius, 6px);
  color: var(--text-dim, #555);
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(4px);
}

.mindmap-viewer__fs-btn:hover {
  color: var(--accent, #27b94b);
  border-color: var(--accent, #27b94b);
  background: rgba(51, 255, 102, 0.1);
}

.mindmap-viewer__fs-btn svg {
  width: 16px;
  height: 16px;
}

/* Close button */
.mindmap-viewer__close-btn {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid var(--border, #222);
  border-radius: var(--radius, 6px);
  color: var(--text-dim, #555);
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(4px);
}

.mindmap-viewer__close-btn:hover {
  color: #ff4444;
  border-color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
}

.mindmap-viewer__close-btn svg {
  width: 20px;
  height: 20px;
}
</style>
