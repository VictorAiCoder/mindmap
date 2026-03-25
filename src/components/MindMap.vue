<!-- src/components/MindMap.vue -->
<!-- Provide/Inject вместо Event Drilling -->
<template>
  <div class="mindmap-container pa-4" @keydown="handleKeydown" tabindex="0" ref="container">
    <NodeItem :node="rootNode" :depth="0" />

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="2000" location="bottom right">
      <v-icon :icon="snackbar.icon" class="mr-2" />
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, provide, onMounted, onUnmounted } from 'vue'
import NodeItem from './NodeItem.vue'
import { useMindMap } from '../composables/useMindMap'

const mindmap = useMindMap()
const { rootNode } = mindmap

// Provide — доступен на любой глубине вложенности
provide('mindmap', mindmap)

const container = ref(null)

const snackbar = reactive({
  show: false,
  text: '',
  color: 'success',
  icon: 'mdi-check'
})

function notify(text, color = 'success', icon = 'mdi-check') {
  Object.assign(snackbar, { show: true, text, color, icon })
}

provide('notify', notify)

function handleKeydown(e) {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z') {
      e.preventDefault()
      mindmap.undo()
    } else if (e.key === 'y') {
      e.preventDefault()
      mindmap.redo()
    } else if (e.key === 's') {
      e.preventDefault()
      mindmap.exportTree('json')
      notify('Карта экспортирована')
    }
  }
}

onMounted(() => {
  container.value?.focus()
})

defineExpose({ mindmap, notify })
</script>

<style scoped>
.mindmap-container {
  min-height: calc(100vh - 64px);
  outline: none;
}
</style>