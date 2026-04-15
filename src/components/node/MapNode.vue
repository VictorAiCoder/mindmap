<!-- src/components/node/MapNode.vue -->
<template>
  <div
    class="map-node"
    :class="nodeClasses"
    :style="nodeStyle"
    @dblclick.stop="$emit('edit')"
    @mousedown.stop="onMouseDown"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dragover.prevent.stop="onImageDragOver"
    @dragleave.stop="isImageDragOver = false"
    @drop.prevent.stop="onImageDrop"
  >
    <NodeImage
      v-if="hasImage"
      :src="pos.node.image"
      :is-root="isRoot"
      :image-width="pos.node.imageWidth"
      @remove="$emit('removeImage')"
      @resize="(w) => $emit('resizeImage', w)"
      @resize-commit="(w) => $emit('resizeImageCommit', w)"
    />

    <div class="map-node__bg" :style="bgStyle" />

   <!-- ★ Кнопка фокуса (лупа) с toggle-состоянием -->
    <Transition name="zoom-btn-fade">
      <button
        v-if="(isHovered || isFocused) && !isDragging"
        class="map-node__focus-btn"
        :class="{ 'map-node__focus-btn--active': isFocused }"
        :title="isFocused ? 'Вернуть масштаб 100%' : 'Фокус на узле (125%)'"
        @click.stop="$emit('focusNode')"
        @mousedown.stop
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7" />
          <!-- Плюс / Минус внутри лупы -->
          <g v-if="!isFocused">
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="11" y1="8" x2="11" y2="14" />
          </g>
          <g v-else>
            <line x1="8" y1="11" x2="14" y2="11" />
          </g>
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      </button>
    </Transition>

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
    >
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
    </NodeContent>

    <NodeNotesPreview
      v-if="hasNotes"
      :notes="pos.node.notes"
      :color="pos.node.color"
      :pinned="pos.node.notesPinned"
      :visible="pos.node.notesVisible !== false"
      @open-notes="$emit('openNotes')"
      @toggle-pin="$emit('toggleNotePin')"
      @toggle-visible="$emit('toggleNotesVisible')"
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
  liveY: { type: Number, default: null },
  isFocused: { type: Boolean, default: false }  // ★
})

const emit = defineEmits([
  'edit', 'addChild', 'delete', 'toggle',
  'resetPosition', 'startDrag',
  'setImage', 'removeImage',
  'resizeImage', 'resizeImageCommit',
  'openNotes', 'toggleNotePin', 'toggleNotesVisible',
  'focusNode'   // ★
])

const imageInput = ref(null)
const isImageDragOver = ref(false)
const isHovered = ref(false)   // ★

const isRoot = computed(() => props.pos.depth === 0)
const isLeaf = computed(() => props.pos.depth >= 2)
const hasChildren = computed(() => props.pos.node.children?.length > 0)
const hasNotes = computed(() => !!props.pos.node.notes?.trim())

const hasImage = computed(() => {
  const img = props.pos.node.image
  return !!img && typeof img === 'string' && img.trim().length > 0
})

const isDragging = computed(() => props.isBeingDragged || props.isInDragGroup)

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
  if (isRoot.value) return { background: color, borderRadius: '25px' }
  if (isLeaf.value) return { background: 'transparent', borderBottom: `2.5px solid ${color}`, borderRadius: '0' }
  return { background: color + '22', border: `2px solid ${color}`, borderRadius: '20px' }
})

function onMouseDown(e) {
  if (e.button === 0) emit('startDrag', e)
}

function triggerImageUpload() { imageInput.value?.click() }

async function onImageSelected(e) {
  const file = e.target?.files?.[0]
  if (!file) return
  e.target.value = ''
  try { emit('setImage', await processImageFile(file)) }
  catch (err) { console.warn('Image upload error:', err.message) }
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
  try { emit('setImage', await processImageFile(file)) }
  catch (err) { console.warn('Image drop error:', err.message) }
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
.map-node:hover :deep(.node-actions) {
  opacity: 1;
  pointer-events: auto;
}

.map-node:hover :deep(.node-image-float:not(.node-image-float--resizing)) {
  transform: translateX(-50%) scale(1.03);
}

.map-node--dragging {
  cursor: grabbing;
  opacity: 0.9;
  z-index: 100 !important;
  transition: none !important;
}

.map-node--in-drag-group {
  opacity: 0.75;
  z-index: 99 !important;
  transition: none !important;
  pointer-events: none;
}

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

/* ── ★ Focus button (лупа) ── */
.map-node__focus-btn {
  position: absolute;
  top: -12px;
  left: -12px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.5);
  cursor: pointer;
  z-index: 20;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.map-node__focus-btn:hover {
  background: rgb(var(--v-theme-primary));
  color: white;
  border-color: rgb(var(--v-theme-primary));
  transform: scale(1.15);
  box-shadow: 0 3px 12px rgba(var(--v-theme-primary), 0.35);
}

.map-node__focus-btn:active {
  transform: scale(0.92);
  transition-duration: 0.1s;
}

/* ★ Активное состояние — нода в фокусе */
.map-node__focus-btn--active {
  background: rgb(var(--v-theme-primary));
  color: white;
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.2),
              0 2px 8px rgba(var(--v-theme-primary), 0.3);
}

.map-node__focus-btn--active:hover {
  background: rgba(var(--v-theme-primary), 0.85);
  transform: scale(1.1);
}

/* ── Transition ── */
.zoom-btn-fade-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.zoom-btn-fade-leave-active {
  transition: all 0.15s ease-in;
}
.zoom-btn-fade-enter-from {
  opacity: 0;
  transform: scale(0.3) rotate(-90deg);
}
.zoom-btn-fade-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>