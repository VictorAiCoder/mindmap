<!-- src/App.vue -->
<template>
  <v-app :theme="theme">
    <ToolbarPanel
      :node-count="nodeCount"
      :depth="treeDepth"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :is-dark="isDark"
      @export="handleExport"
      @import="handleImport"
      @reset="resetToDefault"
      @undo="undo"
      @redo="redo"
      @toggle-theme="toggleTheme"
      @auto-layout="handleAutoLayout"
      @reset-layout="handleResetLayout"
    />

    <v-main>
      <MindMap />
    </v-main>

    <ImportMarkdownHost />
    
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

<script setup lang="ts">
import { reactive, provide } from 'vue'
import ToolbarPanel from './components/panels/ToolbarPanel.vue'
import MindMap from './components/MindMap.vue'
import ImportMarkdownHost from './components/node/ImportMarkdownHost.vue'
import { useMindMap } from './composables/useMindMap'
import { useTheme } from './composables/useTheme'
import { LAYOUT_TYPES } from './composables/layout/useAutoLayout'
import {
  mindMapKey,
  notifyKey,
  type NotifyColor,
  type NotifyFn
} from './types/injection-keys'
import type { LayoutType, ExportFormat } from './types/mindmap-api'

// ─── Core ────────────────────────────────────────────

const mindmap = useMindMap()
provide(mindMapKey, mindmap)

// Деструктуризация refs — чтобы в шаблоне работала авто-распаковка
const {
  nodeCount,
  treeDepth,
  canUndo,
  canRedo,
  undo,
  redo,
  resetToDefault,
  autoLayout,
  resetAllPositions,
  exportTree,
  importTree
} = mindmap

// ─── Theme ───────────────────────────────────────────

const { theme, isDark, toggle: toggleTheme } = useTheme()

// ─── Snackbar ────────────────────────────────────────

interface SnackbarState {
  show: boolean
  text: string
  color: NotifyColor
  icon: string
}

const snackbar = reactive<SnackbarState>({
  show: false,
  text: '',
  color: 'success',
  icon: 'mdi-check'
})

const notify: NotifyFn = (text, color = 'success', icon = 'mdi-check') => {
  Object.assign(snackbar, { show: true, text, color, icon })
}

provide(notifyKey, notify)

// ─── Export ──────────────────────────────────────────

const EXPORT_LABELS: Record<ExportFormat, { text: string; icon: string }> = {
  json: { text: 'Экспорт в JSON', icon: 'mdi-code-json' },
  md: { text: 'Экспорт в Markdown', icon: 'mdi-language-markdown' },
  markdown: { text: 'Экспорт в Markdown', icon: 'mdi-language-markdown' }
}

function handleExport(format: ExportFormat = 'json'): void {
  exportTree(format)
  const label = EXPORT_LABELS[format]
  notify(label.text, 'success', label.icon)
}

// ─── Import ──────────────────────────────────────────

async function handleImport(file: File): Promise<void> {
  try {
    await importTree(file)
    const isMd = /\.(md|markdown)$/i.test(file.name)
    notify(`Импорт из ${isMd ? 'Markdown' : 'JSON'}`, 'success', 'mdi-upload')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка импорта'
    notify(message, 'error', 'mdi-alert')
  }
}

// ─── Layout ──────────────────────────────────────────

function handleAutoLayout(type: LayoutType): void {
  autoLayout(type)
  const layout = LAYOUT_TYPES[type]
  notify(`Раскладка: ${layout.label}`, 'success', layout.icon)
}

function handleResetLayout(): void {
  resetAllPositions()
  notify('Позиции сброшены', 'info', 'mdi-pin-off-outline')
}
</script>

<style>
html, body { overflow-y: auto; }
</style>