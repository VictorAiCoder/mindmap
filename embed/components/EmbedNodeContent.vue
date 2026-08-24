<!-- embed/components/EmbedNodeContent.vue — read-only node text + toggle -->
<template>
  <div class="embed-node-content">
    <button
      v-if="hasChildren"
      class="embed-node-content__toggle"
      @click.stop="emit('toggle')"
    >
      <svg viewBox="0 0 24 24" class="embed-node-content__toggle-icon">
        <path
          :d="collapsed
            ? 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'
            : 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z'"
          fill="currentColor"
        />
      </svg>
    </button>

    <span class="embed-node-content__text" :class="textClasses">{{ text }}</span>

    <span
      v-if="hasNotes"
      class="embed-node-content__notes-icon"
      :style="{ color: noteIconColor }"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
          fill="currentColor"
        />
      </svg>
    </span>

    <span
      v-if="collapsed && hasChildren"
      class="embed-node-content__badge"
      :class="{ 'embed-node-content__badge--root': isRoot }"
    >
      {{ childCount }}
    </span>

    <span
      v-if="pinned"
      class="embed-node-content__pin"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"
          fill="currentColor"
        />
      </svg>
    </span>

    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LayoutPosition } from '../src/features/layout/model/types'

// ─── Props / Emits ────────────────────────────

interface Props {
  pos: LayoutPosition
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggle: []
}>()

// ─── Derived state ────────────────────────────

const node = computed(() => props.pos.node)
const isRoot = computed<boolean>(() => props.pos.depth === 0)
const isLeaf = computed<boolean>(() => props.pos.depth >= 2)

const hasChildren = computed<boolean>(
  () => (node.value.children?.length ?? 0) > 0,
)
const hasNotes = computed<boolean>(() => !!node.value.notes?.trim())
const childCount = computed<number>(() => node.value.children?.length ?? 0)

const text = computed<string>(() => node.value.text)
const color = computed<string>(() => node.value.color || '#5C6BC0')
const collapsed = computed<boolean>(() => !!node.value.collapsed)
const pinned = computed<boolean>(() => props.pos.hasCustomPos)

const noteIconColor = computed<string>(() =>
  isRoot.value ? 'rgba(255,255,255,0.6)' : color.value,
)

// ─── Classes ──────────────────────────────────

const textClasses = computed(() => ({
  'embed-node-content__text--root': isRoot.value,
  'embed-node-content__text--leaf': isLeaf.value,
}))
</script>

<style scoped>
.embed-node-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0.286em 0.857em;
  gap: 0.429em;
}

.embed-node-content__text {
  font-size: 0.929em;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
}

.embed-node-content__text--root {
  font-size: 1.143em;
  font-weight: 700;
  color: white;
  max-width: 10em;
}

.embed-node-content__text--leaf {
  font-size: 0.857em;
  font-weight: 400;
}

.embed-node-content__notes-icon {
  flex-shrink: 0;
  display: inline-flex;
  width: 0.857em;
  height: 0.857em;
  opacity: 0.6;
}

.embed-node-content__toggle {
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.embed-node-content__toggle:hover {
  opacity: 1;
}

.embed-node-content__toggle-icon {
  width: 1.143em;
  height: 1.143em;
}

.embed-node-content__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.2em;
  height: 1.2em;
  padding: 0 0.35em;
  border-radius: 0.6em;
  background: rgba(0, 0, 0, 0.1);
  font-size: 0.714em;
  font-weight: 600;
  line-height: 1;
}

.embed-node-content__badge--root {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

.embed-node-content__pin {
  display: inline-flex;
  width: 0.714em;
  height: 0.714em;
  opacity: 0.4;
  color: grey;
}
</style>
