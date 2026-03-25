<!-- src/App.vue -->
<template>
  <v-app :theme="theme">
    <ToolbarPanel
      :node-count="nodeCount"
      :depth="depth"
      :can-undo="mindmap.canUndo.value"
      :can-redo="mindmap.canRedo.value"
      :is-dark="theme === 'dark'"
      @export="handleExport"
      @import="handleImport"
      @reset="mindmap.resetToDefault()"
      @undo="mindmap.undo()"
      @redo="mindmap.redo()"
      @toggle-theme="toggleTheme"
    />

    <v-main>
      <MindMap ref="mindmapRef" />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ToolbarPanel from './components/ToolbarPanel.vue'
import MindMap from './components/MindMap.vue'
import { useMindMap } from './composables/useMindMap'

const mindmap = useMindMap()
const mindmapRef = ref(null)

// --- Тема ---
const theme = ref(localStorage.getItem('mindmap-theme') || 'light')

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('mindmap-theme', theme.value)
}

// --- Статистика (реактивно пересчитывается) ---
const nodeCount = computed(() => mindmap.countNodes())
const depth = computed(() => mindmap.getDepth())

// --- Экспорт ---
function handleExport() {
  mindmap.exportTree('json')
  mindmapRef.value?.notify('Карта экспортирована', 'success', 'mdi-download')
}

// --- Импорт ---
async function handleImport(file) {
  try {
    await mindmap.importTree(file)
    mindmapRef.value?.notify('Карта импортирована', 'success', 'mdi-upload')
  } catch (err) {
    mindmapRef.value?.notify(err.message, 'error', 'mdi-alert')
  }
}
</script>

<style>
html, body {
  overflow-y: auto;
}
</style>