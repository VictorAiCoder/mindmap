<!-- src/components/MindMap.vue -->
<template>
  <MindMapCanvas v-model:gallery-open="galleryOpenLocal" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MindMapCanvas from './canvas/MindMapCanvas.vue'

const props = withDefaults(defineProps<{
  galleryOpen?: boolean
}>(), {
  galleryOpen: false
})

const emit = defineEmits<{
  'update:galleryOpen': [value: boolean]
}>()

const galleryOpenLocal = computed<boolean>({
  get: () => props.galleryOpen,
  set: (v) => emit('update:galleryOpen', v)
})
</script>