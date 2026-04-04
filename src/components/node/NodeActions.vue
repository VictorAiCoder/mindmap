<!-- src/components/node/NodeActions.vue -->
<template>
  <div class="node-actions" @mousedown.stop>
    <button v-if="!hasImage" class="action action--image" @click.stop="$emit('addImage')">
      <v-icon icon="mdi-image-plus" size="14" />
    </button>
    <button class="action action--notes" @click.stop="$emit('openNotes')">
      <v-icon :icon="hasNotes ? 'mdi-text-box-edit-outline' : 'mdi-text-box-plus-outline'" size="14" />
    </button>
    <button class="action action--add" @click.stop="$emit('addChild')">
      <v-icon icon="mdi-plus" size="14" />
    </button>
    <button class="action action--edit" @click.stop="$emit('edit')">
      <v-icon icon="mdi-pencil" size="14" />
    </button>
    <button v-if="pinned" class="action action--reset" @click.stop="$emit('resetPosition')">
      <v-icon icon="mdi-pin-off" size="14" />
    </button>
    <button v-if="!isRoot" class="action action--delete" @click.stop="$emit('delete')">
      <v-icon icon="mdi-delete" size="14" />
    </button>
  </div>
</template>

<script setup>
defineProps({
  isRoot: { type: Boolean, default: false },
  hasImage: { type: Boolean, default: false },
  hasNotes: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false }
})

defineEmits(['addImage', 'openNotes', 'addChild', 'edit', 'resetPosition', 'delete'])
</script>

<style scoped>
.node-actions {
  position: absolute;
  top: -10px;
  right: -10px;
  display: flex;
  gap: 3px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.action {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.action:hover { transform: scale(1.15); }
.action--add { background: #4CAF50; color: white; }
.action--edit { background: #2196F3; color: white; }
.action--delete { background: #F44336; color: white; }
.action--reset { background: #FF9800; color: white; }
.action--image { background: #9C27B0; color: white; }
.action--notes { background: #607D8B; color: white; }
</style>