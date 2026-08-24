<!-- embed/components/EmbedNodeImage.vue — read-only floating image above node -->
<template>
  <div class="embed-node-image" :style="containerStyle">
    <img
      :src="src"
      class="embed-node-image__img"
      alt=""
      draggable="false"
      referrerpolicy="no-referrer"
      @load="onLoad"
      @error="onError"
    />

    <div
      v-if="hasClip"
      class="embed-node-image__clip"
      :style="clipStyle"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type CSSProperties } from 'vue'

// ─── Local types ──────────────────────────────

interface Clip {
  x: number
  y: number
  w: number
  h: number
}

// ─── Props ────────────────────────────────────

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
  clip: null,
})

// ─── State ────────────────────────────────────

const DEFAULT_WIDTH = 160
const naturalW = ref(0)
const naturalH = ref(0)

// ─── Computed ─────────────────────────────────

const hasClip = computed<boolean>(() => props.clip !== null)

const aspectRatio = computed<number>(() => {
  if (!naturalW.value || !naturalH.value) return 0.75
  if (props.clip) {
    const segW = naturalW.value * props.clip.w
    const segH = naturalW.value * props.clip.h
    if (segW <= 0) return 0.75
    return segH / segW
  }
  return naturalH.value / naturalW.value
})

const displayWidth = computed<number>(() => props.imageWidth ?? DEFAULT_WIDTH)
const displayHeight = computed<number>(() => displayWidth.value * aspectRatio.value)
const visualWidth = computed<number>(() => displayWidth.value * props.scale)
const visualHeight = computed<number>(() => displayHeight.value * props.scale)

const containerStyle = computed<CSSProperties>(() => ({
  width: `${visualWidth.value}px`,
  height: `${visualHeight.value}px`,
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
    backgroundRepeat: 'no-repeat',
  }
})

// ─── Image load ───────────────────────────────

function onLoad(e: Event): void {
  const img = e.target as HTMLImageElement
  naturalW.value = img.naturalWidth
  naturalH.value = img.naturalHeight
}

function onError(e: Event): void {
  const img = e.target as HTMLImageElement
  if (img) img.style.display = 'none'
}
</script>

<style scoped>
.embed-node-image {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.429em;
  border-radius: 0.714em;
  overflow: hidden;
  box-shadow: 0 0.286em 1.143em rgba(0, 0, 0, 0.15);
  background: #fff;
  z-index: 3;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  pointer-events: none;
}

.embed-node-image:hover {
  transform: translateX(-50%) scale(1.03);
  box-shadow: 0 0.429em 1.714em rgba(0, 0, 0, 0.22);
}

.embed-node-image__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.714em;
  pointer-events: none;
  user-select: none;
}

.embed-node-image__img--hidden {
  display: none;
}

.embed-node-image__clip {
  position: absolute;
  inset: 0;
  border-radius: 0.714em;
  pointer-events: none;
  user-select: none;
}
</style>
