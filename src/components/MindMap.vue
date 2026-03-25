<!-- src/components/MindMap.vue -->
<template>
  <div
    class="mindmap-root"
    tabindex="0"
    ref="container"
    @keydown="handleKeydown"
  >
    <MindMapCanvas />
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import MindMapCanvas from './MindMapCanvas.vue'

const mindmap = inject('mindmap')
const notify = inject('notify')
const container = ref(null)

function handleKeydown(e) {
  const mod = e.ctrlKey || e.metaKey

  if (mod && e.key === 'z') {
    e.preventDefault()
    mindmap.undo()
  } else if (mod && e.key === 'y') {
    e.preventDefault()
    mindmap.redo()
  } else if (mod && e.key === 's') {
    e.preventDefault()
    mindmap.exportTree('json')
    notify('Карта экспортирована')
  }
}

onMounted(() => container.value?.focus())
</script>

<style scoped>
.mindmap-root {
  outline: none;
  height: calc(100vh - 64px);
}
</style>