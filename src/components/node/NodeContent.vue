<!-- src/components/node/NodeContent.vue -->
<template>
  <div class="node-content">
    <button v-if="hasChildren" class="node-toggle" @click.stop="$emit('toggle')" @mousedown.stop>
      <v-icon :icon="collapsed ? 'mdi-chevron-right' : 'mdi-chevron-down'" size="16" />
    </button>

    <span class="node-text" :class="textClasses">{{ text }}</span>

    <v-icon
      v-if="hasNotes"
      icon="mdi-text-box-outline"
      size="12"
      class="node-notes-icon"
      :color="isRoot ? 'white' : color"
    />

    <span v-if="collapsed && hasChildren" class="node-badge" :class="{ 'node-badge--root': isRoot }">
      {{ childCount }}
    </span>

    <v-icon v-if="pinned" icon="mdi-pin" size="10" class="node-pin" color="grey" />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  text: { type: String, required: true },
  color: { type: String, default: '#5C6BC0' },
  isRoot: { type: Boolean, default: false },
  isLeaf: { type: Boolean, default: false },
  hasChildren: { type: Boolean, default: false },
  hasNotes: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
  childCount: { type: Number, default: 0 },
  pinned: { type: Boolean, default: false }
})

defineEmits(['toggle'])

const textClasses = computed(() => ({
  'node-text--root': props.isRoot,
  'node-text--leaf': props.isLeaf
}))
</script>

<style scoped>
.node-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 4px 12px;
  gap: 6px;
}

.node-text {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
}

.node-text--root {
  font-size: 16px;
  font-weight: 700;
  color: white;
  max-width: 140px;
}

.node-text--leaf {
  font-size: 12px;
  font-weight: 400;
}

.node-notes-icon {
  opacity: 0.6;
  flex-shrink: 0;
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

.node-badge {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
}

.node-badge--root {
  background: rgba(255, 255, 255, 0.3);
  color: white;
}

.node-pin {
  opacity: 0.4;
}
</style>