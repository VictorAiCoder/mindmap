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
      @auto-layout="handleAutoLayout"
      @reset-layout="handleResetLayout"
    />

    <v-main>
      <MindMap />
    </v-main>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="2000" location="bottom right">
      <v-icon :icon="snackbar.icon" class="mr-2" />
      {{ snackbar.text }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, computed, reactive, provide } from 'vue'
import ToolbarPanel from './components/panels/ToolbarPanel.vue'
import MindMap from './components/MindMap.vue'
import { useMindMap } from './composables/useMindMap'
import { LAYOUT_TYPES } from './composables/layout/useAutoLayout'

const mindmap = useMindMap()
provide('mindmap', mindmap)

// ─── Snackbar ───────────────────────────────

const snackbar = reactive({ show: false, text: '', color: 'success', icon: 'mdi-check' })

function notify(text, color = 'success', icon = 'mdi-check') {
  Object.assign(snackbar, { show: true, text, color, icon })
}

provide('notify', notify)

// ─── Theme ──────────────────────────────────

const theme = ref(localStorage.getItem('mindmap-theme') || 'light')

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('mindmap-theme', theme.value)
}

// ─── Stats ──────────────────────────────────

const nodeCount = computed(() => mindmap.countNodes())
const depth = computed(() => mindmap.getDepth())

// ─── Export ─────────────────────────────────

const EXPORT_LABELS = {
  json: { text: 'Экспорт в JSON', icon: 'mdi-code-json' },
  md: { text: 'Экспорт в Markdown', icon: 'mdi-language-markdown' }
}

function handleExport(format = 'json') {
  mindmap.exportTree(format)
  const label = EXPORT_LABELS[format] || EXPORT_LABELS.json
  notify(label.text, 'success', label.icon)
}

// ─── Import ─────────────────────────────────

async function handleImport(file) {
  try {
    await mindmap.importTree(file)
    const isMd = /\.(md|markdown)$/i.test(file.name)
    notify(`Импорт из ${isMd ? 'Markdown' : 'JSON'}`, 'success', 'mdi-upload')
  } catch (err) {
    notify(err.message, 'error', 'mdi-alert')
  }
}

// ─── Layout ─────────────────────────────────

function handleAutoLayout(type) {
  mindmap.autoLayout(type)
  const layout = LAYOUT_TYPES[type]
  notify(`Раскладка: ${layout?.label || type}`, 'success', layout?.icon || 'mdi-auto-fix')
}

function handleResetLayout() {
  mindmap.resetAllPositions()
  notify('Позиции сброшены', 'info', 'mdi-pin-off-outline')
}
</script>

<style>
html, body { overflow-y: auto; }
</style>