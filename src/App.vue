<!-- src/App.vue -->
<!-- Ключевое: provide ДОЛЖЕН быть здесь, ДО рендера детей -->
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
      <MindMap />
    </v-main>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="2000"
      location="bottom right"
    >
      <v-icon :icon="snackbar.icon" class="mr-2" />
      {{ snackbar.text }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, computed, reactive, provide } from 'vue'
import ToolbarPanel from './components/ToolbarPanel.vue'
import MindMap from './components/MindMap.vue'
import { useMindMap } from './composables/useMindMap'

// 1. Создаём ЕДИНСТВЕННЫЙ экземпляр
const mindmap = useMindMap()

// 2. Проверка — раскомментируй для отладки:
// console.log('mindmap.rootNode:', mindmap.rootNode)
// console.log('mindmap.rootNode.value:', mindmap.rootNode.value)

// 3. Provide — ДО любого рендера дочерних компонентов
provide('mindmap', mindmap)

const snackbar = reactive({
  show: false, text: '', color: 'success', icon: 'mdi-check'
})

function notify(text, color = 'success', icon = 'mdi-check') {
  Object.assign(snackbar, { show: true, text, color, icon })
}

provide('notify', notify)

// Тема
const theme = ref(localStorage.getItem('mindmap-theme') || 'light')

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('mindmap-theme', theme.value)
}

// Статистика
const nodeCount = computed(() => mindmap.countNodes())
const depth = computed(() => mindmap.getDepth())

// Экспорт / Импорт
function handleExport() {
  mindmap.exportTree('json')
  notify('Карта экспортирована', 'success', 'mdi-download')
}

async function handleImport(file) {
  try {
    await mindmap.importTree(file)
    notify('Карта импортирована', 'success', 'mdi-upload')
  } catch (err) {
    notify(err.message, 'error', 'mdi-alert')
  }
}
</script>

<style>
html, body { overflow-y: auto; }
</style>