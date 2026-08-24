<!-- embed/components/EmbedNode.vue — read-only node for embed viewer -->
<template>
  <div
    class="embed-node"
    :class="nodeClasses"
    :style="nodeStyle"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <EmbedNodeImage
      v-if="hasImage"
      :src="imageSrc"
      :clip="resolvedClip"
      :is-root="isRoot"
      :image-width="pos.node.imageWidth"
      :scale="nodeScale"
    />

    <div class="embed-node__bg" :style="bgStyle" />

    <EmbedNodeContent :pos="pos" @toggle="emit('toggle')" />

    <EmbedNotesPreview
      v-if="hasNotes && showNotes"
      :pos="pos"
      :show-notes="showNotes"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef, type CSSProperties } from 'vue'
import { useNodeDisplay } from '../src/entities/node/model/useNodeDisplay'
import { NODE_SCALE } from '../src/entities/node/model/constants'
import type { LayoutPosition } from '../src/features/layout/model/types'
import type { Clip } from '../src/entities/image/model/types'

import EmbedNodeContent from './EmbedNodeContent.vue'
import EmbedNodeImage from './EmbedNodeImage.vue'
import EmbedNotesPreview from './EmbedNotesPreview.vue'

// ─── Props / Emits ────────────────────────────

interface Props {
  pos: LayoutPosition
  showNotes?: boolean
  showImages?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showNotes: true,
  showImages: true,
})

const emit = defineEmits<{
  toggle: []
}>()

// ─── Display state ────────────────────────────

const posRef = toRef(props, 'pos')
const { isRoot, isLeaf, hasNotes, pinned } = useNodeDisplay(posRef)

const isHovered = ref(false)

// ─── Node data ────────────────────────────────

const node = computed(() => props.pos.node)

// ─── Image resolution ─────────────────────────
// In the embed context, imageId references a StoredImage.id.
// The parent (MindmapViewer) resolves imageId → dataUrl.
// Here we only need to know if there IS an image and the clip region.

const hasImage = computed<boolean>(() =>
  props.showImages && !!node.value.imageId,
)
const imageSrc = computed<string>(() => {
  // Image data is resolved by the parent viewer and passed via imageMap.
  // For now, if no imageMap is provided, we use the imageId as a URL hint.
  return node.value.imageId ?? ''
})
const resolvedClip = computed<Clip | null>(() => null)

// ─── Scale ────────────────────────────────────

const nodeScale = computed<number>(() => node.value.scale ?? NODE_SCALE.DEFAULT)

// ─── Classes ──────────────────────────────────

const nodeClasses = computed(() => ({
  'embed-node--root': isRoot.value,
  'embed-node--leaf': isLeaf.value,
  'embed-node--has-image': hasImage.value,
  'embed-node--pinned': pinned.value,
}))

// ─── Styles ───────────────────────────────────

const nodeStyle = computed<CSSProperties>(() => ({
  position: 'absolute',
  left: `${props.pos.x}px`,
  top: `${props.pos.y}px`,
  width: `${props.pos.w}px`,
  height: `${props.pos.h}px`,
  '--node-scale': nodeScale.value,
}))

const bgStyle = computed<CSSProperties>(() => {
  const color = node.value.color || '#5C6BC0'

  if (isRoot.value) {
    return {
      background: color,
      borderRadius: '1.786em',
    }
  }

  if (isLeaf.value) {
    return {
      background: 'transparent',
      borderBottom: `0.179em solid ${color}`,
      borderRadius: '0',
    }
  }

  return {
    background: `${color}22`,
    border: `0.143em solid ${color}`,
    borderRadius: '1.429em',
  }
})
</script>

<style scoped>
.embed-node {
  position: absolute;
  cursor: default;
  user-select: none;
  transition: left 0.2s ease, top 0.2s ease;
  z-index: 2;
  overflow: visible;
  font-size: calc(14px * var(--node-scale, 1));
}

.embed-node:hover {
  z-index: 5;
}

.embed-node--has-image {
  z-index: 3;
}

.embed-node--pinned::after {
  content: '';
  position: absolute;
  top: -0.214em;
  right: -0.214em;
  width: 0.571em;
  height: 0.571em;
  border-radius: 50%;
  background: #FF9800;
  border: 0.107em solid white;
  z-index: 11;
}

.embed-node__bg {
  position: absolute;
  inset: 0;
  transition: all 0.2s ease;
  pointer-events: none;
}
</style>
