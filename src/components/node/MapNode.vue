<!-- src/components/node/MapNode.vue -->
<template>
  <div
    class="map-node"
    :class="nodeClasses"
    :style="nodeStyle"
    @dblclick.stop="emit('edit')"
    @mousedown.stop="onMouseDown"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dragover.prevent.stop="onImageDragOver"
    @dragleave.stop="isImageDragOver = false"
    @drop.prevent.stop="onImageDrop"
  >
    <NodeImage
      v-if="hasImage"
      :src="imageSrc"
      :clip="resolvedImage?.clip ?? null"
      :is-root="isRoot"
      :image-width="pos.node.imageWidth"
      :scale="effectiveScale"
      @remove="emit('removeImage')"
      @resize="(w) => emit('resizeImage', w)"
      @resize-commit="(w) => emit('resizeImageCommit', w)"
      @edit-segments="emit('editSegments', pos.id)"
    />

    <div class="map-node__bg" :style="bgStyle" />

    <Transition name="zoom-btn-fade">
      <button
        v-if="(isHovered || isFocused) && !isDragging"
        class="map-node__focus-btn"
        :class="{ 'map-node__focus-btn--active': isFocused }"
        :title="isFocused ? 'Вернуть масштаб 100%' : 'Фокус на узле (125%)'"
        @click.stop="emit('focusNode')"
        @mousedown.stop
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
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

    <NodeContent :pos="pos" @toggle="emit('toggle')">
      <NodeActions :active="isMenuActive" @click="onActionsClick" />
    </NodeContent>

    <NodeNotesPreview
      v-if="hasNotes"
      :pos="pos"
      @open-notes="emit('openNotes')"
      @toggle-pin="emit('toggleNotePin')"
      @toggle-visible="emit('toggleNotesVisible')"
    />

    <input
      ref="imageInput"
      type="file"
      accept="image/*"
      hidden
      @change="onImageSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, toRef, type Ref, type CSSProperties } from 'vue'
import { computeEffectiveScale } from '@/composables/node/useNodeScale'
import { useNodeMenu } from '@/composables/useNodeMenu'
import { useNodeImage } from '@/composables/node/useNodeImage'
import { useNodeDisplay } from '@/composables/node/useNodeDisplay'
import { NODE_SCALE } from '@/entities/node'
import type { LayoutPosition } from '@/types/layout'
import type { ImageStorageApi } from '@/types/mindmap-api'

import NodeImage from './NodeImage.vue'
import NodeContent from './NodeContent.vue'
import NodeNotesPreview from './NodeNotesPreview.vue'
import NodeActions from './NodeActions.vue'

// ─── Props / Emits ──────────────────────────
import type { NodeDragState } from '@/entities/node'
import { DEFAULT_NODE_DRAG_STATE } from '@/entities/node'

interface Props {
  pos: LayoutPosition
  drag?: NodeDragState
  isFocused?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  drag: () => ({ ...DEFAULT_NODE_DRAG_STATE }),
  isFocused: false,
})

const emit = defineEmits<{
  edit: []
  addChild: []
  delete: []
  toggle: []
  resetPosition: []
  startDrag: [event: MouseEvent]
  setImage: [dataUrl: string]
  setImageById: [imageId: string]
  removeImage: []
  resizeImage: [width: number]
  resizeImageCommit: [width: number]
  openNotes: []
  toggleNotePin: []
  toggleNotesVisible: []
  focusNode: []
  editSegments: [nodeId: string]
}>()

// ─── Inject ─────────────────────────────────
const globalZoom = inject<Ref<number>>('globalZoom', ref(1))
const imageStorage = inject<ImageStorageApi | null>('imageStorage', null)

// ─── Refs / State ───────────────────────────
const isHovered = ref(false)

// ─── Shared display state ───────────────────
const posRef = toRef(props, 'pos')
const { isRoot, isLeaf, hasNotes } = useNodeDisplay(posRef)

// ─── Image logic (composable) ───────────────
const {
  
  isImageDragOver,
  resolvedImage,
  hasImage,
  imageSrc,
  triggerImageUpload,
  onImageSelected,
  onImageDragOver,
  onImageDrop,
} = useNodeImage(posRef, imageStorage, emit)

// ─── Menu coordination ─────────────────────
const { activeMenuId, openMenu } = useNodeMenu()

const isMenuActive = computed<boolean>(
  () => activeMenuId.value === props.pos.node.id,
)

function onActionsClick({ triggerEl }: { triggerEl: HTMLElement }): void {
  openMenu(
    triggerEl,
    {
      nodeId: props.pos.node.id,
      isRoot: isRoot.value,
      hasImage: hasImage.value,
      hasNotes: hasNotes.value,
      pinned: props.pos.hasCustomPos,
      w: props.pos.w,
      h: props.pos.h,
    },
    {
      onAddImage: triggerImageUpload,
      onOpenNotes: () => emit('openNotes'),
      onAddChild: () => emit('addChild'),
      onEdit: () => emit('edit'),
      onResetPosition: () => emit('resetPosition'),
      onDelete: () => emit('delete'),
      onEditSegments: () => emit('editSegments', props.pos.id),
    },
  )
}

// ─── Computed: drag / scale ─────────────────
const isDragging = computed<boolean>(
  () => props.drag.isBeingDragged || props.drag.isInDragGroup,
)

const nodeScale = computed<number>(
  () => props.pos.node.scale ?? NODE_SCALE.DEFAULT,
)
const effectiveScale = computed<number>(() =>
  computeEffectiveScale(nodeScale.value, globalZoom.value),
)

// ─── Computed: классы и стили ───────────────
const nodeClasses = computed(() => ({
  'map-node--root': isRoot.value,
  'map-node--leaf': isLeaf.value,
  'map-node--has-image': hasImage.value,
  'map-node--drag-over': props.drag.isDraggedOver,
  'map-node--dragging': props.drag.isBeingDragged,
  'map-node--in-drag-group':
    props.drag.isInDragGroup && !props.drag.isBeingDragged,
  'map-node--custom': props.pos.hasCustomPos,
  'map-node--image-drop': isImageDragOver.value,
  'map-node--scaled': nodeScale.value !== NODE_SCALE.DEFAULT,
}))

const nodeStyle = computed<CSSProperties>(() => {
  const x = props.drag.liveX ?? props.pos.x
  const y = props.drag.liveY ?? props.pos.y
  return {
    position: 'absolute',
    left: `${x}px`, top: `${y}px`,
    width: `${props.pos.w}px`, height: `${props.pos.h}px`,
    zIndex: props.drag.isBeingDragged ? 100 : props.drag.isInDragGroup ? 99 : undefined,
    transition: isDragging.value ? 'none' : undefined,
    '--node-scale': effectiveScale.value,
  } as CSSProperties
})

const bgStyle = computed<CSSProperties>(() => {
  const color = props.pos.node.color || '#5C6BC0'
  if (isRoot.value) {
    return { background: color, borderRadius: '1.786em' }
  }
  if (isLeaf.value) {
    return {
      background: 'transparent',
      borderBottom: `0.179em solid ${color}`,
      borderRadius: '0',
    }
  }
  return {
    background: color + '22',
    border: `0.143em solid ${color}`,
    borderRadius: '1.429em',
  }
})

// ─── Handlers ───────────────────────────────
function onMouseDown(e: MouseEvent): void {
  if (e.button === 0) emit('startDrag', e)
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
  font-size: calc(14px * var(--node-scale, 1));
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
  box-shadow: 0 0 0 0.214em rgba(33, 150, 243, 0.6) !important;
}

.map-node--image-drop .map-node__bg {
  box-shadow: 0 0 0 0.214em rgba(76, 175, 80, 0.6) !important;
}

.map-node--scaled { z-index: 3; }
.map-node--scaled:hover { z-index: 6; }

.map-node--custom::after {
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

.map-node--has-image :deep(.node-actions) {
  top: auto;
  bottom: -0.714em;
}

.map-node__bg {
  position: absolute;
  inset: 0;
  transition: all 0.2s ease;
}

.map-node__focus-btn {
  position: absolute;
  top: -0.857em;
  left: -0.857em;
  width: 1.857em;
  height: 1.857em;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.143em solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.5);
  cursor: pointer;
  z-index: 20;
  padding: 0;
  box-shadow: 0 0.143em 0.571em rgba(0, 0, 0, 0.12);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.map-node__focus-btn svg {
  width: 1.714em;
  height: 1.714em;
}

.map-node__focus-btn:hover {
  background: rgb(var(--v-theme-primary));
  color: white;
  border-color: rgb(var(--v-theme-primary));
  transform: scale(1.15);
  box-shadow: 0 0.214em 0.857em rgba(var(--v-theme-primary), 0.35);
}

.map-node__focus-btn:active {
  transform: scale(0.92);
  transition-duration: 0.1s;
}

.map-node__focus-btn--active {
  background: rgb(var(--v-theme-primary));
  color: white;
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 0.214em rgba(var(--v-theme-primary), 0.2),
              0 0.143em 0.571em rgba(var(--v-theme-primary), 0.3);
}

.map-node__focus-btn--active:hover {
  background: rgba(var(--v-theme-primary), 0.85);
  transform: scale(1.1);
}

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