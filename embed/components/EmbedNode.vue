<!-- embed/components/EmbedNode.vue � read-only node for embed viewer -->
<template>
  <div
    class="embed-node"
    :class="nodeClasses"
    :style="nodeStyle"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Image slot or default -->
    <component
      v-if="hasImage"
      :is="imageSlot ?? EmbedNodeImage"
      v-bind="imageSlotProps"
    />

    <div class="embed-node__bg" :style="bgStyle" />

    <EmbedNodeContent
      ref="contentRef"
      :pos="pos"
      :preview-mode="false"
      @toggle="emit('toggle')"
      @menu-toggle="onMenuToggle"
    />

    <!-- Notes slot or default -->
    <component
      v-if="hasNotes && showNotes"
      :is="notesSlot ?? EmbedNotesPreview"
      v-bind="notesSlotProps"
    />

    <!-- Menu: custom slot or default -->
    <template v-if="menuOpen">
      <component
        v-if="menuSlot"
        :is="menuSlotRenderer"
      />
      <EmbedNodeMenu
        v-else
        :node="node"
        :depth="pos.depth"
        :is-open="menuOpen"
        :trigger-el="menuTriggerEl"
        @close="menuOpen = false"
        @toggle-collapse="emit('toggle')"
        @toggle-notes="menuOpen = false"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, toRef, h, type CSSProperties } from 'vue'
import { useNodeDisplay } from '@entities/node/model/useNodeDisplay'
import { NODE_SCALE } from '@entities/node/model/constants'
import type { LayoutPosition } from '@features/layout/model/types'
import type { Clip } from '@entities/image/model/types'
import type { StoredImage } from '@entities/image/model/types'
import { embedSlotsKey } from '../injection-keys'

import EmbedNodeContent from './EmbedNodeContent.vue'
import EmbedNodeImage from './EmbedNodeImage.vue'
import EmbedNotesPreview from './EmbedNotesPreview.vue'
import EmbedNodeMenu from './EmbedNodeMenu.vue'

// --- Props / Emits ----------------------------

interface Props {
  pos: LayoutPosition
  showNotes?: boolean
  showImages?: boolean
  imagePool?: StoredImage[] | null
}

const props = withDefaults(defineProps<Props>(), {
  showNotes: true,
  showImages: true,
  imagePool: null,
})

const emit = defineEmits<{
  toggle: []
}>()

// --- Inject slots -----------------------------

const embedSlots = inject(embedSlotsKey, {})

const imageSlot = computed(() => embedSlots?.image)
const notesSlot = computed(() => embedSlots?.notes)
const menuSlot = computed(() => embedSlots?.menu)

// --- Display state ----------------------------

const posRef = toRef(props, 'pos')
const { isRoot, isLeaf, hasNotes, pinned } = useNodeDisplay(posRef)

const isHovered = ref(false)

// --- Node data --------------------------------

const node = computed(() => props.pos.node)

// --- Image resolution -------------------------

const hasImage = computed<boolean>(() =>
  props.showImages && !!node.value.imageId,
)
const imageSrc = computed<string>(() => {
  if (!node.value.imageId || !props.imagePool) return ''
  const img = props.imagePool.find(i => i.id === node.value.imageId)
  if (!img) return ''
  return img.kind === 'raw' ? img.dataUrl : ''
})
const resolvedClip = computed<Clip | null>(() => null)

const imageSlotProps = computed(() => ({
  node: node.value,
  src: imageSrc.value,
  clip: resolvedClip.value,
  isRoot: isRoot.value,
  imageWidth: node.value.imageWidth,
  scale: node.value.scale ?? NODE_SCALE.DEFAULT,
}))

// --- Notes slot props -------------------------

const notesSlotProps = computed(() => ({
  node: node.value,
  notes: node.value.notes ?? '',
  color: node.value.color || '#27b94b',
  isExpanded: false,
  isLong: (node.value.notes ?? '').length > 200 || (node.value.notes ?? '').split('\n').length > 5,
}))

// --- Menu slot props ---

const menuSlotProps = computed(() => ({
  node: node.value,
  isRoot: isRoot.value,
  isLeaf: isLeaf.value,
  hasNotes: hasNotes.value,
  hasChildren: (node.value.children?.length ?? 0) > 0,
  hasImage: hasImage.value,
}))

const menuSlotRenderer = computed(() => {
  if (!menuSlot.value) return null
  const slotFn = menuSlot.value
  const props = menuSlotProps.value
  return { render: () => slotFn(props) }
})

// --- Scale ------------------------------------

const nodeScale = computed<number>(() => node.value.scale ?? NODE_SCALE.DEFAULT)

// --- Menu state -------------------------------

const menuOpen = ref(false)
const menuTriggerEl = ref<HTMLElement | null>(null)
const contentRef = ref<InstanceType<typeof EmbedNodeContent> | null>(null)

function onMenuToggle(event: MouseEvent) {
  if (menuSlot.value) {
    // Custom menu slot � emit event for consumer
    // For now, just open default menu
  }
  menuTriggerEl.value = contentRef.value?.menuTriggerRef ?? null
  menuOpen.value = !menuOpen.value
}

// --- Classes ----------------------------------

const nodeClasses = computed(() => ({
  'embed-node--root': isRoot.value,
  'embed-node--leaf': isLeaf.value,
  'embed-node--has-image': hasImage.value,
  'embed-node--pinned': pinned.value,
}))

// --- Styles -----------------------------------

const nodeStyle = computed<CSSProperties>(() => ({
  position: 'absolute',
  left: `${props.pos.x}px`,
  top: `${props.pos.y}px`,
  width: `${props.pos.w}px`,
  height: `${props.pos.h}px`,
  '--node-scale': nodeScale.value,
}))

const bgStyle = computed<CSSProperties>(() => {
  const color = node.value.color || '#27b94b'

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
