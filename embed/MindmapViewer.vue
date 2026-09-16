<!-- embed/MindmapViewer.vue — root component for mindmap embed -->
<template>
  <div
    class="mindmap-viewer"
    :class="viewerClasses"
    :style="viewerStyle"
  >
    <!-- Fullscreen toggle button (hidden in fullscreen) -->
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
    <MindMapCanvas
      v-if="editMode && api && rootNode"
      :api="api"
      :gallery-open="false"
    />
    <EmbedCanvas
      v-else-if="rootNode"
      :root-node="rootNode"
      :layout-type="layout"
      :show-notes="showNotes && !previewMode"
      :show-images="showImages"
      :preview-mode="previewMode"
      :image-pool="imagePool"
    />
  </div>

  <!-- Fullscreen overlay via Teleport -->
  <Teleport to="body">
    <div v-if="isFullscreen" class="mindmap-viewer__overlay">
      <div class="mindmap-viewer__overlay-viewer">
        <EmbedCanvas
          v-if="rootNode"
          :root-node="rootNode"
          :layout-type="layout"
          :show-notes="showNotes"
          :show-images="showImages"
          :image-pool="imagePool"
        />
      </div>
      <button class="mindmap-viewer__close-btn" title="Закрыть (Esc)" @click="exitFullscreen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, provide, type CSSProperties } from 'vue'
import type { MindMapNode } from '@entities/node'
import type { LayoutType } from '@features/layout/lib/types'
import type { StoredImage } from '@entities/image'
import type { MindMapApi } from './types/mindmap-api'
import { traverseTree } from '@entities/mindmap'
import { parseMarkdownToTree } from './lib/parse'
import { embedSlotsKey, mindMapKey, type EmbedSlots } from './injection-keys'
import EmbedCanvas from './components/EmbedCanvas.vue'
import MindMapCanvas from './components/MindMapCanvas.vue'

declare const $fetch: <T = any>(url: string, options?: any) => Promise<T>

// ─── Props ─────────────────────────────────────

interface Props {
  markdown?: string
  slug?: string
  layout?: LayoutType
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
  layout: 'mindmap',
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

// ─── State ─────────────────────────────────────

const isFullscreen = ref(false)
const isLoading = ref(false)

// ─── Fullscreen ────────────────────────────────

function enterFullscreen() {
  isFullscreen.value = true
}

function exitFullscreen() {
  isFullscreen.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isFullscreen.value) {
    exitFullscreen()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  if (isFullscreen.value) exitFullscreen()
})

// ─── Load mindmap data ─────────────────────────

const imagePool = ref<StoredImage[]>([])

const rootNode = ref<MindMapNode | null>(null)

const ENC_ACCENT = '#27b94b'

function applyAccentColor(root: MindMapNode): void {
  traverseTree(root, (node) => {
    if (node.color === '#5C6BC0') {
      node.color = ENC_ACCENT
    }
  })
}

function collapseBeyondDepth(node: MindMapNode, depth: number, max: number): void {
  if (depth >= max && node.children.length > 0) {
    node.collapsed = true
  }
  if (!node.collapsed) {
    node.children.forEach(child => collapseBeyondDepth(child, depth + 1, max))
  }
}

function parseMarkdown(value: string): void {
  if (!value?.trim()) {
    rootNode.value = null
    return
  }
  const tree = parseMarkdownToTree(value, imagePool)
  if (tree) {
    applyAccentColor(tree)
  }
  rootNode.value = tree
  if (tree && props.maxDepth !== undefined) {
    collapseBeyondDepth(tree, 0, props.maxDepth)
  }
}

async function loadFromApi(slug: string): Promise<boolean> {
  try {
    const doc = await $fetch<{ root?: MindMapNode; images?: StoredImage[] }>(`/api/mindmap/${slug}`)
    if (doc?.root) {
      if (doc.images?.length) {
        imagePool.value = doc.images
      }
      applyAccentColor(doc.root)
      rootNode.value = doc.root
      if (props.maxDepth !== undefined) {
        collapseBeyondDepth(doc.root, 0, props.maxDepth)
      }
      return true
    }
  } catch (err) {
    console.error('[MindmapViewer] loadFromApi error:', err)
  }
  return false
}

onMounted(async () => {
  if (props.slug) {
    isLoading.value = true
    const loaded = await loadFromApi(props.slug)
    if (!loaded && props.markdown) {
      parseMarkdown(props.markdown)
    }
    isLoading.value = false
  } else if (props.markdown) {
    parseMarkdown(props.markdown)
  }
})

watch(() => props.slug, async (newSlug) => {
  if (newSlug) {
    isLoading.value = true
    const loaded = await loadFromApi(newSlug)
    if (!loaded && props.markdown) {
      parseMarkdown(props.markdown)
    }
    isLoading.value = false
  }
})

watch(() => props.markdown, (md) => {
  if (!props.slug && md) {
    parseMarkdown(md)
  }
})

// ─── Derived ───────────────────────────────────

const viewerClasses = computed(() => ({
  'mindmap-viewer--fullscreen': isFullscreen.value,
  [props.class || '']: !!props.class,
}))

const viewerStyle = computed<CSSProperties>(() => {
  if (isFullscreen.value) {
    return {
      width: '100%',
      height: '100%',
    }
  }
  return {
    height: props.height,
    width: '100%',
    border: '1px solid var(--border, #222)',
    borderRadius: 'var(--radius, 6px)',
    overflow: 'hidden',
    position: 'relative',
    background: 'var(--bg, #0a100d)',
  }
})
</script>

<style scoped>
.mindmap-viewer {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
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

/* Fullscreen overlay */
.mindmap-viewer__overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--bg, #0a100d);
}

.mindmap-viewer__overlay-viewer {
  width: 100%;
  height: 100%;
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
