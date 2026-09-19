<template>
  <div
    class="map-node"
    :class="nodeClasses"
    :style="nodeStyle"
    @dblclick.stop="command({ type: 'edit' })"
    @mousedown.stop="onMouseDown"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
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
      @remove="command({ type: 'removeImage' })"
      @resize="(w: number) => command({ type: 'resizeImage', width: w })"
      @resize-commit="(w: number) => command({ type: 'resizeImageCommit', width: w })"
      @edit-segments="command({ type: 'editSegments', nodeId: pos.id })"
    />

    <div class="map-node__bg" :style="bgStyle" />

    <Transition name="zoom-btn-fade">
      <button
        v-if="(isHovered || isFocused) && !isDragging"
        class="map-node__focus-btn"
        :class="{ 'map-node__focus-btn--active': isFocused }"
        :title="isFocused ? 'Вернуть масштаб 100%' : 'Фокус на узле (125%)'"
        @click.stop="command({ type: 'focusNode' })"
        @mousedown.stop
      >
        <IconFocus :focused="isFocused" />
      </button>
    </Transition>

    <NodeContent :pos="pos" @toggle="command({ type: 'toggle' })">
      <NodeActions :active="isMenuActive" @click="onActionsClick" />
    </NodeContent>

    <NodeNotesPreview
      v-if="hasNotes"
      :pos="pos"
      @open-notes="command({ type: 'openNotes' })"
      @toggle-pin="command({ type: 'toggleNotePin' })"
      @toggle-visible="command({ type: 'toggleNotesVisible' })"
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
import { ref, computed, inject, toRef, type CSSProperties } from 'vue'
import { injectStrict } from '@shared/lib/injectStrict'

import { computeEffectiveScale } from '@entities/node/model/useNodeScale'
import { useNodeMenu } from '../composables/useNodeMenu'
import { useNodeImage } from '@entities/node/model/useNodeImage'
import { useNodeDisplay } from '@entities/node/model/useNodeDisplay'
import { useMapNodeDrag } from '../composables/useMapNodeDrag'
import { useMapNodeHover } from '../composables/useMapNodeHover'
import { NODE_SCALE } from '@entities/node'
import type { LayoutPosition } from '@features/layout'

import { globalZoomKey, imageStorageKey } from '../injection-keys'
import type { NodeCommand } from '../types/node-command'

import NodeImage from './NodeImage.vue'
import NodeContent from './NodeContent.vue'
import NodeNotesPreview from './NodeNotesPreview.vue'
import NodeActions from './NodeActions.vue'
import IconFocus from './icons/IconFocus.vue'

// ─── Props / Emits ──────────────────────────
import type { NodeDragState } from '@entities/node'
import { DEFAULT_NODE_DRAG_STATE } from '@entities/node'

interface Props {
  pos: LayoutPosition
  drag?: NodeDragState
  isFocused?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  drag: () => ({ ...DEFAULT_NODE_DRAG_STATE }),
  isFocused: false,
})

const emit = defineEmits<{ command: [cmd: NodeCommand] }>()

function command(cmd: NodeCommand) {
  emit('command', cmd)
}

// ─── Inject ─────────────────────────────────
const globalZoom = injectStrict(globalZoomKey)
const imageStorage = inject(imageStorageKey, null)

// ─── Shared display state ───────────────────
const posRef = toRef(props, 'pos')
const { isRoot, isLeaf, hasNotes } = useNodeDisplay(posRef)

// ─── Composables ────────────────────────────
const { isDragging, onMouseDown } = useMapNodeDrag(command)

const { isHovered, onMouseEnter, onMouseLeave } = useMapNodeHover({
  isMenuOpen: computed(() => isMenuActive.value),
})

// ─── Image logic (composable) ───────────────
const {
  imageInput,
  isImageDragOver,
  resolvedImage,
  hasImage,
  imageSrc,
  triggerImageUpload,
  onImageSelected,
  onImageDragOver,
  onImageDrop,
} = useNodeImage(posRef, imageStorage, command)

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
      onOpenNotes: () => command({ type: 'openNotes' }),
      onAddChild: () => command({ type: 'addChild' }),
      onEdit: () => command({ type: 'edit' }),
      onResetPosition: () => command({ type: 'resetPosition' }),
      onDelete: () => command({ type: 'delete' }),
      onEditSegments: () => command({ type: 'editSegments', nodeId: props.pos.id }),
    },
  )
}

// ─── Computed: drag / scale ─────────────────
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
