<!-- embed/components/EmbedCanvas.vue — simplified read-only canvas for embed -->
<template>
  <ClientOnly>
    <div
      class="embed-canvas"
      :class="{ 'embed-canvas--preview': previewMode }"
      ref="canvasRef"
      @wheel.prevent="previewMode ? undefined : onWheel"
      @mousedown="previewMode ? undefined : onPanStart"
      @mousemove="previewMode ? undefined : onPanMove"
      @mouseup="previewMode ? undefined : onPanEnd"
      @mouseleave="previewMode ? undefined : onPanEnd"
    >
      <div
        class="embed-canvas__world"
        :style="worldStyle"
      >
        <svg
          class="embed-canvas__connections"
          :width="sceneWidth"
          :height="sceneHeight"
          :viewBox="`0 0 ${sceneWidth} ${sceneHeight}`"
        >
          <path
            v-for="conn in connections"
            :key="conn.id"
            :d="conn.path"
            :stroke="conn.color"
            stroke-width="2.5"
            fill="none"
            stroke-linecap="round"
            class="embed-canvas__conn-line"
          />
        </svg>

        <EmbedNode
          v-for="pos in positions"
          :key="pos.node.id"
          :pos="pos"
          :show-notes="showNotes"
          :show-images="showImages"
          :image-pool="imagePool"
          @toggle="onToggleNode"
        />
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, type CSSProperties } from 'vue'
import type { MindMapNode } from '@entities/node'
import type { LayoutType } from '@features/layout/lib/types'
import type { StoredImage } from '@entities/image'
import { useLayout } from '@features/layout/model/useLayout'
import { usePanZoom } from '../composables/useEmbedPanZoom'
import { useConnections } from '../composables/useEmbedConnections'
import EmbedNode from './EmbedNode.vue'

// ─── Props ─────────────────────────────────────

interface Props {
  rootNode: MindMapNode
  layoutType?: LayoutType
  showNotes?: boolean
  showImages?: boolean
  previewMode?: boolean
  imagePool?: StoredImage[] | null
}

const props = withDefaults(defineProps<Props>(), {
  showNotes: true,
  showImages: true,
  previewMode: false,
  imagePool: null,
})

// ─── Layout ────────────────────────────────────

const { layoutData } = useLayout(computed(() => props.rootNode))

// ─── Connections ───────────────────────────────
// Read-only: no drag, so getLivePosition always returns null

function getLivePosition(
  _nodeId: string,
  _originalX: number,
  _originalY: number,
): null {
  return null
}

const connections = useConnections(
  computed(() => props.rootNode),
  layoutData,
  getLivePosition,
)

// ─── Pan / Zoom ────────────────────────────────

const panZoom = usePanZoom()
const canvasRef = ref<HTMLElement | null>(null)

const positions = computed(() => layoutData.value.positions)
const bounds = computed(() => layoutData.value.bounds)

watch(() => props.imagePool, (pool) => {
  console.log('[IMG-DEBUG] EmbedCanvas imagePool prop:', {
    hasPool: !!pool,
    poolLength: pool?.length ?? 0,
  })
}, { immediate: true })

const sceneWidth = computed(() => bounds.value.width)
const sceneHeight = computed(() => bounds.value.height)

function onPanStart(e: MouseEvent): void {
  panZoom.startPan(e)
}

function onPanMove(e: MouseEvent): void {
  panZoom.movePan(e)
}

function onPanEnd(): void {
  panZoom.endPan()
}

function onWheel(e: WheelEvent): void {
  panZoom.onWheel(e, canvasRef.value)
}

function onToggleNode(): void {
  // Read-only: toggle handled by node component internally
}

// ─── World positioning ─────────────────────────
// Center the scene in the viewport after mount.

const isMounted = ref(false)

const worldStyle = computed<CSSProperties>(() => {
  if (!isMounted.value) {
    return { transform: 'translate(0, 0) scale(1)' }
  }

  const el = canvasRef.value
  if (!el) {
    return { transform: 'translate(0, 0) scale(1)' }
  }

  const b = bounds.value
  const vw = el.clientWidth
  const vh = el.clientHeight
  const z = panZoom.zoom.value

  const tx = vw / 2 - z * (b.minX + b.width / 2) + panZoom.panX.value
  const ty = vh / 2 - z * (b.minY + b.height / 2) + panZoom.panY.value

  return {
    width: `${sceneWidth.value}px`,
    height: `${sceneHeight.value}px`,
    transform: `translate(${tx}px, ${ty}px) scale(${z})`,
    transformOrigin: '0 0',
  }
})

// ─── Init ──────────────────────────────────────

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  isMounted.value = true
  panZoom.setWrapper(canvasRef.value)

  const el = canvasRef.value
  if (el) {
    const b = bounds.value
    panZoom.setRootSceneCenter(
      b.minX + b.width / 2,
      b.minY + b.height / 2,
    )
    panZoom.setBounds(b.minX, b.minY)

    // Recalculate on container resize (fullscreen, responsive)
    resizeObserver = new ResizeObserver(() => {
      const curBounds = bounds.value
      panZoom.setRootSceneCenter(
        curBounds.minX + curBounds.width / 2,
        curBounds.minY + curBounds.height / 2,
      )
      panZoom.setBounds(curBounds.minX, curBounds.minY)
    })
    resizeObserver.observe(el)
  }

  if (props.previewMode && el) {
    const b = bounds.value
    panZoom.fitToContainer(b.width, b.height, el.clientWidth, el.clientHeight)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

watch(layoutData, (b) => {
  panZoom.setRootSceneCenter(
    b.bounds.minX + b.bounds.width / 2,
    b.bounds.minY + b.bounds.height / 2,
  )
  panZoom.setBounds(b.bounds.minX, b.bounds.minY)
})
</script>

<style scoped>
.embed-canvas {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  cursor: grab;
}

.embed-canvas:active {
  cursor: grabbing;
}

.embed-canvas__world {
  position: absolute;
  top: 0;
  left: 0;
}

.embed-canvas__connections {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
}

.embed-canvas__conn-line {
  transition: d 0.2s ease;
}

.embed-canvas--preview {
  cursor: default;
  pointer-events: none;
}
</style>
