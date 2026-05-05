<!-- src/components/canvas/DragHint.vue -->
<template>
  <Transition name="fade">
    <div v-if="isDragging && !hasTarget" class="drag-hint">
      <v-icon icon="mdi-cursor-move" size="16" class="mr-1" />
      Бросьте на узел чтобы вложить, или на пустое место
    </div>
  </Transition>

  <Transition name="fade">
    <div v-if="hasTarget" class="drag-hint drag-hint--drop">
      <v-icon icon="mdi-subdirectory-arrow-right" size="16" class="mr-1" />
      Отпустите чтобы сделать дочерним
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  isDragging: { type: Boolean, default: false },
  hasTarget: { type: Boolean, default: false }
})
</script>

<style scoped>
.drag-hint {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  background: rgba(var(--v-theme-surface), 0.95);
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 20px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 20;
  display: flex;
  align-items: center;
  pointer-events: none;
  white-space: nowrap;
}

.drag-hint--drop {
  background: rgba(33, 150, 243, 0.12);
  border-color: rgba(33, 150, 243, 0.4);
  color: rgb(33, 150, 243);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>