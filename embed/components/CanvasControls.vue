<!-- embed/components/CanvasControls.vue -->
<template>
  <div class="zoom-controls">
    <v-btn icon="mdi-plus" size="small" variant="tonal" @click="$emit('zoomIn')" />
    <v-chip size="small" variant="tonal" class="my-1">{{ zoomPercent }}%</v-chip>
    <v-btn icon="mdi-minus" size="small" variant="tonal" @click="$emit('zoomOut')" />
    <v-btn icon="mdi-fit-to-screen" size="small" variant="tonal" class="mt-1" @click="$emit('resetView')" />
  </div>
</template>

<script setup>
defineProps({
  zoomPercent: { type: Number, default: 100 }
})

defineEmits(['zoomIn', 'zoomOut', 'resetView'])
</script>

<style scoped>
.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 10;
}
</style>
