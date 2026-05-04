<!-- src/components/node/NodeContent.vue -->
<template>
  <div class="node-content">
    <button
      v-if="hasChildren"
      class="node-toggle"
      @click.stop="$emit('toggle')"
      @mousedown.stop
    >
      <v-icon
        :icon="collapsed ? 'mdi-chevron-right' : 'mdi-chevron-down'"
        class="node-toggle__icon"
      />
    </button>

    <span class="node-text" :class="textClasses">{{ text }}</span>

    <v-icon
      v-if="hasNotes"
      icon="mdi-text-box-outline"
      class="node-notes-icon"
      :color="isRoot ? 'white' : color"
    />

    <span
      v-if="collapsed && hasChildren"
      class="node-badge"
      :class="{ 'node-badge--root': isRoot }"
    >
      {{ childCount }}
    </span>

    <v-icon v-if="pinned" icon="mdi-pin" class="node-pin" color="grey" />

    <div><slot /></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LayoutPosition } from '@/types/layout'

// ─── Props / Emits ──────────────────────────

interface Props {
  pos: LayoutPosition
}

const props = defineProps<Props>()

defineEmits<{
  toggle: []
}>()

// ─── Derived state ──────────────────────────
// TODO(useNodeDisplay): эти же вычисления дублируются в MapNode.vue
// (isRoot, isLeaf, hasChildren, hasNotes). Кандидат на общий composable
// useNodeDisplay(pos) в следующем шаге. Сейчас — локально, для самодостаточности.

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

// ─── Classes ────────────────────────────────

const textClasses = computed(() => ({
  'node-text--root': isRoot.value,
  'node-text--leaf': isLeaf.value,
}))
</script>

<style scoped>
/* Все размеры в em — автоматически масштабируются через font-size на .map-node.
   База: 1em = 14px × var(--node-scale). */
.node-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0.286em 0.857em;
  gap: 0.429em;
}

.node-text {
  font-size: 0.929em;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
}

.node-text--root {
  font-size: 1.143em;
  font-weight: 700;
  color: white;
  max-width: 10em;
}

.node-text--leaf {
  font-size: 0.857em;
  font-weight: 400;
}

.node-notes-icon {
  opacity: 0.6;
  flex-shrink: 0;
  font-size: 0.857em !important;
}

.node-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.node-toggle:hover { opacity: 1; }

.node-toggle__icon {
  font-size: 1.143em !important;
}

.node-badge {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 0.714em;
  padding: 0 0.429em;
  font-size: 0.714em;
  font-weight: 600;
  min-width: 1.286em;
  text-align: center;
}

.node-badge--root {
  background: rgba(255, 255, 255, 0.3);
  color: white;
}

.node-pin {
  opacity: 0.4;
  font-size: 0.714em !important;
}
</style>