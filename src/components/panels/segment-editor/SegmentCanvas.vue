<!-- src/components/panels/segment-editor/SegmentCanvas.vue -->
<template>
  <div
    ref="rootRef"
    class="seg-canvas"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <img
      ref="imgRef"
      :src="imageSrc"
      class="seg-canvas__img"
      draggable="false"
      @load="onImgLoad"
    />

    <template v-if="imgLoaded">
      <!-- Существующие сегменты -->
      <div
        v-for="seg in segments"
        :key="seg.id"
        class="seg-rect"
        :class="{ 'seg-rect--selected': selectedId === seg.id }"
        :style="rectStyle(seg.clip)"
        @pointerdown.stop="onSegmentPointerDown($event, seg.id)"
      >
        <div
          v-for="corner in corners"
          :key="corner"
          class="seg-handle"
          :class="`seg-handle--${corner}`"
          @pointerdown.stop="onHandlePointerDown($event, seg.id, corner)"
        />
        <div v-if="seg.name" class="seg-rect__label">{{ seg.name }}</div>
      </div>

      <!-- Draft (создаваемый прямоугольник) -->
      <div
        v-if="draftRect"
        class="seg-rect seg-rect--draft"
        :style="rectStyle(draftRect)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ImageSegment } from '@/types/mindmap'
import type { Rect, Corner } from '@/composables/image/useSegmentEditor'

const props = defineProps<{
  imageSrc: string
  segments: readonly ImageSegment[]
  selectedId: string | null
  draftRect: Rect | null
}>()

const emit = defineEmits<{
  (e: 'begin-create', nx: number, ny: number): void
  (e: 'begin-move', id: string, nx: number, ny: number): void
  (e: 'begin-resize', id: string, corner: Corner, nx: number, ny: number): void
  (e: 'pointer-move', nx: number, ny: number): void
  (e: 'pointer-up'): void
  (e: 'select', id: string | null): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const imgLoaded = ref(false)

const corners: Corner[] = ['tl', 'tr', 'bl', 'br']

function onImgLoad(): void {
  imgLoaded.value = true
}

function rectStyle(clip: Rect) {
  return {
    left: `${clip.x * 100}%`,
    top: `${clip.y * 100}%`,
    width: `${clip.w * 100}%`,
    height: `${clip.h * 100}%`,
  }
}

/** Pointer event → normalized [0..1] координаты внутри картинки. */
function toNormalized(e: PointerEvent): { nx: number; ny: number } | null {
  const img = imgRef.value
  if (!img) return null
  const rect = img.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
  return { nx, ny }
}

function capture(e: PointerEvent): void {
  const root = rootRef.value
  if (!root) return
  try {
    root.setPointerCapture(e.pointerId)
  } catch {
    /* Safari иногда падает на already-captured */
  }
}

function release(e: PointerEvent): void {
  const root = rootRef.value
  if (!root) return
  try {
    root.releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return
  const norm = toNormalized(e)
  if (!norm) return
  // Клик по фону — снимаем выделение и начинаем create
  emit('select', null)
  capture(e)
  emit('begin-create', norm.nx, norm.ny)
}

function onSegmentPointerDown(e: PointerEvent, id: string): void {
  if (e.button !== 0) return
  const norm = toNormalized(e)
  if (!norm) return
  capture(e)
  emit('begin-move', id, norm.nx, norm.ny)
}

function onHandlePointerDown(e: PointerEvent, id: string, corner: Corner): void {
  if (e.button !== 0) return
  const norm = toNormalized(e)
  if (!norm) return
  capture(e)
  emit('begin-resize', id, corner, norm.nx, norm.ny)
}

function onPointerMove(e: PointerEvent): void {
  const norm = toNormalized(e)
  if (!norm) return
  emit('pointer-move', norm.nx, norm.ny)
}

function onPointerUp(e: PointerEvent): void {
  release(e)
  emit('pointer-up')
}
</script>

<style scoped>
.seg-canvas {
  position: relative;
  display: inline-block;
  user-select: none;
  touch-action: none;
  max-width: 100%;
  max-height: 100%;
  line-height: 0;
  background: #1a1a1a;
}

.seg-canvas__img {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  height: auto;
  width: auto;
  pointer-events: none;
}

.seg-rect {
  position: absolute;
  border: 2px solid rgba(255, 255, 255, 0.85);
  background: rgba(33, 150, 243, 0.12);
  cursor: move;
  box-sizing: border-box;
  transition: background 0.15s, border-color 0.15s;
}

.seg-rect:hover {
  background: rgba(33, 150, 243, 0.22);
}

.seg-rect--selected {
  border-color: rgb(33, 150, 243);
  background: rgba(33, 150, 243, 0.28);
  box-shadow: 0 0 0 1px rgba(33, 150, 243, 0.4);
  z-index: 2;
}

.seg-rect--draft {
  border-color: rgb(76, 175, 80);
  background: rgba(76, 175, 80, 0.2);
  border-style: dashed;
  pointer-events: none;
}

.seg-rect__label {
  position: absolute;
  top: -22px;
  left: 0;
  font-size: 11px;
  line-height: 1.4;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
  font-family: system-ui, sans-serif;
}

.seg-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #fff;
  border: 2px solid rgb(33, 150, 243);
  border-radius: 50%;
  box-sizing: border-box;
}

.seg-handle--tl { top: -7px; left: -7px;  cursor: nwse-resize; }
.seg-handle--tr { top: -7px; right: -7px; cursor: nesw-resize; }
.seg-handle--bl { bottom: -7px; left: -7px;  cursor: nesw-resize; }
.seg-handle--br { bottom: -7px; right: -7px; cursor: nwse-resize; }

.seg-rect:not(.seg-rect--selected) .seg-handle {
  opacity: 0;
  pointer-events: none;
}
</style>