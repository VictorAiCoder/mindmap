<!-- src/components/node/MapNode.vue -->
<template>
  <div
    class="map-node"
    :class="nodeClasses"
    :style="nodeStyle"
    @dblclick.stop="$emit('edit')"
    @mousedown.stop="onMouseDown"
    @dragover.prevent.stop="onImageDragOver"
    @dragleave.stop="isImageDragOver = false"
    @drop.prevent.stop="onImageDrop"
  >
    <NodeImage
      v-if="hasImage"
      :src="pos.node.image"
      :is-root="isRoot"
      @remove="$emit('removeImage')"
    />

    <div class="map-node__bg" :style="bgStyle" />

    <NodeContent
      :text="pos.node.text"
      :color="pos.node.color"
      :is-root="isRoot"
      :is-leaf="isLeaf"
      :has-children="hasChildren"
      :has-notes="hasNotes"
      :collapsed="pos.node.collapsed"
      :child-count="pos.node.children?.length || 0"
      :pinned="pos.hasCustomPos"
      @toggle="$emit('toggle')"
    />

    <NodeNotesPreview
      v-if="hasNotes"
      :notes="pos.node.notes"
      :color="pos.node.color"
      @open-notes="$emit('openNotes')"
    />

    <NodeActions
      :is-root="isRoot"
      :has-image="hasImage"
      :has-notes="hasNotes"
      :pinned="pos.hasCustomPos"
      @add-image="triggerImageUpload"
      @open-notes="$emit('openNotes')"
      @add-child="$emit('addChild')"
      @edit="$emit('edit')"
      @reset-position="$emit('resetPosition')"
      @delete="$emit('delete')"
    />

    <input ref="imageInput" type="file" accept="image/*" hidden @change="onImageSelected" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { processImageFile, getImageFromDrop } from '../../composables/useImageHandler'
import NodeImage from './NodeImage.vue'
import NodeContent from './NodeContent.vue'
import NodeNotesPreview from './NodeNotesPreview.vue'
import NodeActions from './NodeActions.vue'

const props = defineProps({
  pos: { type: Object, required: true },
  isDraggedOver: { type: Boolean, default: false },
  isBeingDragged: { type: Boolean, default: false },
  isInDragGroup: { type: Boolean, default: false },
  liveX: { type: Number, default: null },
  liveY: { type: Number, default: null }
})

const emit = defineEmits([
  'edit', 'addChild', 'delete', 'toggle',
  'resetPosition', 'startDrag',
  'setImage', 'removeImage', 'openNotes'
])

const imageInput = ref(null)
const isImageDragOver = ref(false)

// ─── Computed ───────────────────────────────

const isRoot = computed(() => props.pos.depth === 0)
const isLeaf = computed(() => props.pos.depth >= 2)
const hasChildren = computed(() => props.pos.node.children?.length > 0)
const hasNotes = computed(() => !!props.pos.node.notes?.trim())

const hasImage = computed(() => {
  const img = props.pos.node.image
  return !!img && typeof img === 'string' && img.trim().length > 0
})

const nodeClasses = computed(() => ({
  'map-node--root': isRoot.value,
  'map-node--leaf': isLeaf.value,
  'map-node--has-image': hasImage.value,
  'map-node--drag-over': props.isDraggedOver,
  'map-node--dragging': props.isBeingDragged,
  'map-node--in-drag-group': props.isInDragGroup && !props.isBeingDragged,
  'map-node--custom': props.pos.hasCustomPos,
  'map-node--image-drop': isImageDragOver.value
}))

const isDragging = computed(() => props.isBeingDragged || props.isInDragGroup)

const nodeStyle = computed(() => {
  const x = props.liveX ?? props.pos.x
  const y = props.liveY ?? props.pos.y

  return {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: `${props.pos.w}px`,
    height: `${props.pos.h}px`,
    zIndex: props.isBeingDragged ? 100 : props.isInDragGroup ? 99 : undefined,
    transition: isDragging.value ? 'none' : undefined
  }
})

const bgStyle = computed(() => {
  const color = props.pos.node.color || '#5C6BC0'

  if (isRoot.value) {
    return { background: color, borderRadius: '25px' }
  }
  if (isLeaf.value) {
    return {
      background: 'transparent',
      borderBottom: `2.5px solid ${color}`,
      borderRadius: '0'
    }
  }
  return {
    background: color + '22',
    border: `2px solid ${color}`,
    borderRadius: '20px'
  }
})

// ─── Event Handlers ─────────────────────────

function onMouseDown(e) {
  if (e.button === 0) emit('startDrag', e)
}

function triggerImageUpload() {
  imageInput.value?.click()
}

async function onImageSelected(e) {
  const file = e.target?.files?.[0]
  if (!file) return
  e.target.value = ''
  try {
    emit('setImage', await processImageFile(file))
  } catch (err) {
    console.warn('Image upload error:', err.message)
  }
}

function onImageDragOver(e) {
  if (e.dataTransfer?.types?.includes('Files')) {
    isImageDragOver.value = true
    e.dataTransfer.dropEffect = 'copy'
  }
}

async function onImageDrop(e) {
  isImageDragOver.value = false
  const file = getImageFromDrop(e)
  if (!file) return
  try {
    emit('setImage', await processImageFile(file))
  } catch (err) {
    console.warn('Image drop error:', err.message)
  }
}
</script>

<style scoped>
.map-node {
  position: absolute;
  cursor: grab;
  user-select: none;
  transition: transform 0.15s ease, opacity 0.15s ease, left 0.2s ease, top 0.2s ease;
  z-index: 2;
  overflow: visible;
}

.map-node:hover { z-index: 5; }
.map-node:hover :deep(.node-actions) { opacity: 1; pointer-events: auto; }
.map-node:hover :deep(.node-image-float) { transform: translateX(-50%) scale(1.03); }

/* ★ Перетаскиваемый узел (главный) */
.map-node--dragging {
  cursor: grabbing;
  opacity: 0.9;
  z-index: 100 !important;
  transition: none !important;
}

/* ★ Узлы из drag-группы (потомки) — двигаются вместе */
.map-node--in-drag-group {
  opacity: 0.75;
  z-index: 99 !important;
  transition: none !important;
  pointer-events: none;
}

/* ★ Визуальная обводка группы при перетаскивании */
.map-node--dragging .map-node__bg,
.map-node--in-drag-group .map-node__bg {
  filter: brightness(1.1);
}

.map-node--drag-over .map-node__bg {
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.6) !important;
}

.map-node--image-drop .map-node__bg {
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.6) !important;
}

.map-node--custom::after {
  content: '';
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #FF9800;
  border: 1.5px solid white;
  z-index: 11;
}

.map-node--has-image :deep(.node-actions) {
  top: auto;
  bottom: -10px;
}

.map-node__bg {
  position: absolute;
  inset: 0;
  transition: all 0.2s ease;
}
</style>