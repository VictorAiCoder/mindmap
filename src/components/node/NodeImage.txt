<!-- src/components/node/NodeImage.vue -->
<template>
  <div
    class="node-image-float"
    :class="{ 'node-image-float--resizing': isResizing }"
    :style="containerStyle"
  >
    <img
      :src="src"
      class="node-image"
      alt=""
      draggable="false"
      referrerpolicy="no-referrer"
      @load="onLoad"
      @error="onError"
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

    <!-- Кнопка удаления -->
    <button class="node-image-remove" @click.stop="$emit('remove')" @mousedown.stop>
      <v-icon icon="mdi-close" size="12" />
    </button>

    <!-- Лейбл размера при ресайзе -->
    <Transition name="size-fade">
      <div v-if="isResizing" class="node-image-size">
        {{ Math.round(liveWidth) }} × {{ Math.round(liveHeight) }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  isRoot: { type: Boolean, default: false },
  imageWidth: { type: Number, default: null }
})

const emit = defineEmits(['remove', 'resize', 'resize-commit'])

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

const aspectRatio = computed(() => {
  if (!naturalW.value || !naturalH.value) return 0.75
  return naturalH.value / naturalW.value
})

const displayWidth = computed(() => {
  if (isResizing.value) return liveWidth.value
  return props.imageWidth || DEFAULT_WIDTH
})

const liveHeight = computed(() => {
  return liveWidth.value * aspectRatio.value
})

const displayHeight = computed(() => {
  return displayWidth.value * aspectRatio.value
})

const containerStyle = computed(() => ({
  width: `${displayWidth.value}px`,
  height: `${displayHeight.value}px`
}))

// ─── Синхронизация props → liveWidth ────────

watch(() => props.imageWidth, (val) => {
  if (!isResizing.value) {
    liveWidth.value = val || DEFAULT_WIDTH
  }
})

// ─── Image Events ───────────────────────────

function onLoad(e) {
  naturalW.value = e.target.naturalWidth
  naturalH.value = e.target.naturalHeight

  if (!props.imageWidth) {
    liveWidth.value = Math.min(
      Math.max(naturalW.value, MIN_WIDTH),
      DEFAULT_WIDTH
    )
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

/**
 * ★ Пропорциональный ресайз.
 *
 * Тянем за правый нижний угол → deltaX = основной вклад,
 * deltaY вносит пропорциональный вклад через aspectRatio.
 *
 *   ┌──────────────────────┐
 *   │                      │
 *   │      картинка        │  height = width × ratio
 *   │                      │
 *   └──────────────────── ◢ ← handle
 *                         ↘
 *                    drag direction
 *
 * Формула:  newWidth = startWidth + (deltaX + deltaY / ratio) / 2
 *
 * Центрирование:  left: 50% + translateX(-50%) в CSS
 * → при изменении width контейнер автоматически
 *   остаётся по центру ноды.
 */
function updateSize(clientX, clientY) {
  const dx = clientX - startX.value
  const dy = clientY - startY.value
  const ratio = aspectRatio.value || 0.75

  // Диагональная проекция — оба направления вносят вклад
  const delta = (dx + dy / ratio) / 2

  let newW = startWidth.value + delta
  newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(newW)))

  liveWidth.value = newW

  // Live-обновление (без записи в history)
  emit('resize', newW)
}

function commit() {
  isResizing.value = false
  const finalWidth = Math.round(liveWidth.value)

  // Финальный коммит с записью в history
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
  margin-bottom: 6px;
  border-radius: 10px;
  overflow: visible;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  background: rgb(var(--v-theme-surface));
  z-index: 3;
  transition: transform 0.2s ease, width 0.15s ease, height 0.15s ease, box-shadow 0.2s ease;
}

/* При ресайзе — убираем transition чтобы не лагало */
.node-image-float--resizing {
  transition: none !important;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.22);
}

/* ─── Картинка ─────────────────────────────── */

.node-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
  pointer-events: none;
  user-select: none;
}

/* ─── Resize Handle ────────────────────────── */

.node-image-resize {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-surface), 0.92);
  border: 1.5px solid rgba(0, 0, 0, 0.12);
  border-radius: 3px 0 10px 0;
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

/* ─── Remove Button ────────────────────────── */

.node-image-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
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

/* ─── Size Label ─────────────────────────── */

.node-image-size {
  position: absolute;
  bottom: -22px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.72);
  color: white;
  font-size: 10px;
  font-weight: 600;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  padding: 2px 8px;
  border-radius: 4px;
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