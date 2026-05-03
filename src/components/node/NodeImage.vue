<!-- src/components/node/NodeImage.vue -->
<template>
  <div
    class="node-image-float"
    :class="{ 'node-image-float--resizing': isResizing }"
    :style="containerStyle"
  >
    <!--
      Сегмент: фон через background-image, а видимый <img> скрываем.
      Скрытый <img> всё равно нужен для загрузки и получения naturalW/H.
    -->
    <img
      :src="src"
      class="node-image"
      :class="{ 'node-image--measure-only': hasClip }"
      alt=""
      draggable="false"
      referrerpolicy="no-referrer"
      @load="onLoad"
      @error="onError"
    />

    <!-- Слой для сегмента: рендерится через background-image -->
    <div
      v-if="hasClip"
      class="node-image-clip"
      :style="clipStyle"
      aria-hidden="true"
    />

    <!-- ★ Resize handle — правый нижний угол -->
    <div
      class="node-image-resize"
      @mousedown.stop.prevent="startResize"
      @touchstart.stop.prevent="startResizeTouch"
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path d="M 9 1 L 1 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        <path d="M 9 5 L 5 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
      </svg>
    </div>

    <!-- ★ Кнопка "Редактировать сегменты" — только для целых картинок -->
    <button
      v-if="!hasClip"
      class="node-image-edit-segments"
      title="Редактор сегментов"
      @click.stop="$emit('editSegments')"
      @mousedown.stop
      @pointerdown.stop
    >
      <v-icon icon="mdi-crop" size="12" />
    </button>

    <!-- Кнопка удаления -->
    <button class="node-image-remove" @click.stop="$emit('remove')" @mousedown.stop>
      <v-icon icon="mdi-close" size="12" />
    </button>

    <!-- Лейбл размера при ресайзе -->
    <Transition name="size-fade">
      <div v-if="isResizing" class="node-image-size">
        {{ Math.round(liveWidth * scale) }} × {{ Math.round(liveHeight * scale) }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  isRoot: { type: Boolean, default: false },
  imageWidth: { type: Number, default: null },
  scale: { type: Number, default: 1 },
  /**
   * ★ Нормализованный прямоугольник вырезки [0..1].
   * null/undefined = показываем картинку целиком (RawImage).
   */
  clip: {
    type: Object,
    default: null,
    validator: (v) => v === null || (
      typeof v.x === 'number' && typeof v.y === 'number' &&
      typeof v.w === 'number' && typeof v.h === 'number'
    )
  }
})

// ★ Добавлен editSegments
const emit = defineEmits(['remove', 'resize', 'resize-commit', 'editSegments'])

// ─── Константы ──────────────────────────────
const MIN_WIDTH = 100
const MAX_WIDTH = 1000
const DEFAULT_WIDTH = 160

// ─── State ──────────────────────────────────
const naturalW = ref(0)
const naturalH = ref(0)
const isResizing = ref(false)
const liveWidth = ref(props.imageWidth || DEFAULT_WIDTH)

// Стартовые данные ресайза
const startX = ref(0)
const startY = ref(0)
const startWidth = ref(0)

// ─── Computed ───────────────────────────────

const hasClip = computed(() => !!props.clip)

const aspectRatio = computed(() => {
  if (!naturalW.value || !naturalH.value) return 0.75
  if (props.clip) {
    const segW = naturalW.value * props.clip.w
    const segH = naturalH.value * props.clip.h
    if (segW <= 0) return 0.75
    return segH / segW
  }
  return naturalH.value / naturalW.value
})

const displayWidth = computed(() => {
  if (isResizing.value) return liveWidth.value
  return props.imageWidth || DEFAULT_WIDTH
})

const liveHeight = computed(() => liveWidth.value * aspectRatio.value)
const displayHeight = computed(() => displayWidth.value * aspectRatio.value)

const visualWidth = computed(() => displayWidth.value * props.scale)
const visualHeight = computed(() => displayHeight.value * props.scale)

const containerStyle = computed(() => ({
  width: `${visualWidth.value}px`,
  height: `${visualHeight.value}px`
}))

const clipStyle = computed(() => {
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

// ─── Синхронизация props → liveWidth ────────

watch(() => props.imageWidth, (val) => {
  if (!isResizing.value) {
    liveWidth.value = val || DEFAULT_WIDTH
  }
})

watch(() => props.clip, () => {
  if (!props.imageWidth && naturalW.value) {
    applyAutoWidth()
  }
}, { deep: true })

// ─── Image Events ───────────────────────────

function applyAutoWidth() {
  const nw = props.clip
    ? naturalW.value * props.clip.w
    : naturalW.value
  liveWidth.value = Math.min(Math.max(nw, MIN_WIDTH), DEFAULT_WIDTH)
}

function onLoad(e) {
  naturalW.value = e.target.naturalWidth
  naturalH.value = e.target.naturalHeight

  if (!props.imageWidth) {
    applyAutoWidth()
  }
}

function onError(e) {
  e.target.style.display = 'none'
}

// ─── Resize: Mouse ──────────────────────────

function startResize(e) {
  isResizing.value = true
  startX.value = e.clientX
  startY.value = e.clientY
  startWidth.value = displayWidth.value

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e) {
  updateSize(e.clientX, e.clientY)
}

function onMouseUp() {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  commit()
}

// ─── Resize: Touch ──────────────────────────

function startResizeTouch(e) {
  if (!e.touches.length) return
  isResizing.value = true
  startX.value = e.touches[0].clientX
  startY.value = e.touches[0].clientY
  startWidth.value = displayWidth.value

  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
  window.addEventListener('touchcancel', onTouchEnd)
}

function onTouchMove(e) {
  e.preventDefault()
  if (!e.touches.length) return
  updateSize(e.touches[0].clientX, e.touches[0].clientY)
}

function onTouchEnd() {
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('touchcancel', onTouchEnd)
  commit()
}

// ─── Resize: Core Logic ─────────────────────

function updateSize(clientX, clientY) {
  const dx = clientX - startX.value
  const dy = clientY - startY.value
  const ratio = aspectRatio.value || 0.75
  const scale = props.scale || 1

  const delta = (dx + dy / ratio) / 2 / scale

  let newW = startWidth.value + delta
  newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(newW)))

  liveWidth.value = newW
  emit('resize', newW)
}

function commit() {
  isResizing.value = false
  const finalWidth = Math.round(liveWidth.value)
  emit('resize-commit', finalWidth)
}

// ─── Cleanup ────────────────────────────────

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('touchcancel', onTouchEnd)
})
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