<template>
  <div
    class="node-image-float"
    :class="{ 'node-image-float--resizing': isResizing }"
    :style="containerStyle"
    @mouseleave="onMouseLeave"
  >
    <img
      ref="imgEl"
      :src="src"
      class="node-image"
      :class="{ 'node-image--measure-only': hasClip }"
      alt=""
      draggable="false"
      referrerpolicy="no-referrer"
      @load="onLoad"
      @error="onError"
    />

    <div
      v-if="hasClip"
      class="node-image-clip"
      :style="clipStyle"
      aria-hidden="true"
    />

    <div
      class="node-image-resize"
      @mousedown.stop.prevent="onMouseDown"
      @touchstart.stop.prevent="onTouchStart"
    >
      <IconResize />
    </div>

    <button
      v-if="!hasClip"
      class="node-image-edit-segments"
      title="Редактировать сегменты"
      @click.stop="emit('editSegments')"
      @mousedown.stop
      @pointerdown.stop
    >
      <v-icon icon="mdi-crop" size="12" />
    </button>

    <button class="node-image-remove" @click.stop="emit('remove')" @mousedown.stop>
      <v-icon icon="mdi-close" size="12" />
    </button>

    <Transition name="size-fade">
      <div v-if="isResizing" class="node-image-size">
        {{ Math.round(liveWidth * scale) }} × {{ Math.round(displayHeight * scale) }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRef, type CSSProperties } from 'vue'
import type { Clip } from '@entities/image'
import { useImageResize } from '../composables/useImageResize'
import IconResize from './icons/IconResize.vue'

// ─── Props / Emits ──────────────────────────

interface Props {
  src: string
  isRoot?: boolean
  imageWidth?: number | null
  scale?: number
  clip?: Clip | null
}

const props = withDefaults(defineProps<Props>(), {
  isRoot: false,
  imageWidth: null,
  scale: 1,
  clip: null
})

const emit = defineEmits<{
  remove: []
  resize: [width: number]
  'resize-commit': [width: number]
  editSegments: []
}>()

// ─── State ──────────────────────────────────

const imgEl = ref<HTMLImageElement | null>(null)
const naturalW = ref(0)
const naturalH = ref(0)

// ─── Computed ───────────────────────────────

const hasClip = computed<boolean>(() => props.clip !== null)

const aspectRatio = computed<number>(() => {
  if (!naturalW.value || !naturalH.value) return 0.75
  if (props.clip) {
    const segW = naturalW.value * props.clip.w
    const segH = naturalH.value * props.clip.h
    if (segW <= 0) return 0.75
    return segH / segW
  }
  return naturalH.value / naturalW.value
})

// ─── Resize composable ──────────────────────

const { liveWidth, isResizing, onMouseDown, onTouchStart, onMouseLeave } = useImageResize(
  {
    imageWidth: toRef(props, 'imageWidth'),
    scale: toRef(props, 'scale'),
    aspectRatio,
  },
  emit
)

const displayWidth = computed<number>(() => {
  if (isResizing.value) return liveWidth.value
  return props.imageWidth ?? 160
})

const displayHeight = computed<number>(() => displayWidth.value * aspectRatio.value)
const visualWidth = computed<number>(() => displayWidth.value * props.scale)
const visualHeight = computed<number>(() => displayHeight.value * props.scale)

const containerStyle = computed<CSSProperties>(() => ({
  width: `${visualWidth.value}px`,
  height: `${visualHeight.value}px`
}))

const clipStyle = computed<CSSProperties>(() => {
  if (!props.clip) return {}
  const { x, y, w, h } = props.clip

  const sizeX = w > 0 ? 100 / w : 100
  const sizeY = h > 0 ? 100 / h : 100

  const posX = (1 - w) > 0.0001 ? (x / (1 - w)) * 100 : 0
  const posY = (1 - h) > 0.0001 ? (y / (1 - h)) * 100 : 0

  return {
    backgroundImage: `url("${props.src}")`,
    backgroundSize: `${sizeX}% ${sizeY}%`,
    backgroundPosition: `${posX}% ${posY}%`,
    backgroundRepeat: 'no-repeat'
  }
})

// ─── Image Events ───────────────────────────

const MIN_WIDTH = 100
const DEFAULT_WIDTH = 160

function applyAutoWidth(): void {
  const nw = props.clip
    ? naturalW.value * props.clip.w
    : naturalW.value
  liveWidth.value = Math.min(Math.max(nw, MIN_WIDTH), DEFAULT_WIDTH)
}

function onLoad(): void {
  if (!imgEl.value) return
  naturalW.value = imgEl.value.naturalWidth
  naturalH.value = imgEl.value.naturalHeight

  if (props.imageWidth === null) {
    applyAutoWidth()
  }
}

function onError(): void {
  if (imgEl.value) imgEl.value.style.display = 'none'
}

// Sync clip changes → auto width
watch(() => props.clip, () => {
  if (props.imageWidth === null && naturalW.value) {
    applyAutoWidth()
  }
}, { deep: true })
</script>

<style scoped>
.node-image-float {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.429em;
  border-radius: 0.714em;
  overflow: hidden;
  box-shadow: 0 0.286em 1.143em rgba(0, 0, 0, 0.15);
  background: rgb(var(--v-theme-surface));
  z-index: 3;
  transition: transform 0.2s ease, width 0.15s ease, height 0.15s ease, box-shadow 0.2s ease;
}

.node-image-float--resizing {
  transition: none !important;
  box-shadow: 0 0.429em 1.714em rgba(0, 0, 0, 0.22);
}

.node-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.714em;
  pointer-events: none;
  user-select: none;
}

.node-image--measure-only {
  visibility: hidden;
}

.node-image-clip {
  position: absolute;
  inset: 0;
  border-radius: 0.714em;
  pointer-events: none;
  user-select: none;
}

.node-image-resize {
  position: absolute;
  right: -0.214em;
  bottom: -0.214em;
  width: 1.429em;
  height: 1.429em;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-surface), 0.92);
  border: 0.107em solid rgba(0, 0, 0, 0.12);
  border-radius: 0.214em 0 0.714em 0;
  cursor: nwse-resize;
  color: rgba(0, 0, 0, 0.35);
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease, transform 0.15s ease;
  z-index: 5;
}

.node-image-float:hover .node-image-resize,
.node-image-float--resizing .node-image-resize {
  opacity: 1;
}

.node-image-resize:hover {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  transform: scale(1.15);
}

.node-image-float--resizing .node-image-resize {
  background: rgba(var(--v-theme-primary), 0.18);
  color: rgb(var(--v-theme-primary));
  opacity: 1;
}

/* ─── Кнопки в правом верхнем углу ─── */
/* "Удалить" — самый правый */
.node-image-remove {
  position: absolute;
  top: 0.286em;
  right: 0.286em;
  width: 1.429em;
  height: 1.429em;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s, transform 0.15s, background 0.2s;
  z-index: 5;
}
.node-image-float:hover .node-image-remove { opacity: 1; }
.node-image-remove:hover {
  background: rgba(244, 67, 54, 0.9);
  transform: scale(1.1);
}

/* ★ "Редактировать сегменты" */
.node-image-edit-segments {
  position: absolute;
  top: 0.286em;
  left: 0.286em;
  width: 1.429em;
  height: 1.429em;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); */
  cursor: pointer;
  opacity: 0.9;
  transition: opacity 0.2s, transform 0.15s, background 0.2s;
  z-index: 500;
}
.node-image-float:hover .node-image-edit-segments { opacity: 1; }
.node-image-edit-segments:hover {
  background: rgba(var(--v-theme-primary), 0.9);
  transform: scale(1.2);
}

.node-image-size {
  position: absolute;
  bottom: -1.571em;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.72);
  color: white;
  font-size: 0.714em;
  font-weight: 600;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  padding: 0.143em 0.571em;
  border-radius: 0.286em;
  white-space: nowrap;
  pointer-events: none;
  z-index: 6;
}

.size-fade-enter-active,
.size-fade-leave-active {
  transition: opacity 0.15s ease;
}
.size-fade-enter-from,
.size-fade-leave-to {
  opacity: 0;
}
</style>
