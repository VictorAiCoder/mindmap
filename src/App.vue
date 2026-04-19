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
import { ref, computed, reactive, provide } from 'vue'
import ToolbarPanel from './components/panels/ToolbarPanel.vue'
import MindMap from './components/MindMap.vue'
import { useMindMap } from './composables/useMindMap'
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

// ─── Theme ───────────────────────────────────────────

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'mindmap-theme'

function readTheme(): Theme {
  const saved = localStorage.getItem(THEME_STORAGE_KEY)
  return saved === 'dark' ? 'dark' : 'light'
}

const theme = ref<Theme>(readTheme())

function toggleTheme(): void {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem(THEME_STORAGE_KEY, theme.value)
}

// ─── Stats ───────────────────────────────────────────

const nodeCount = computed(() => mindmap.countNodes())
const depth = computed(() => mindmap.getDepth())

// ─── Export ──────────────────────────────────────────

const EXPORT_LABELS: Record<ExportFormat, { text: string; icon: string }> = {
  json: { text: 'Экспорт в JSON', icon: 'mdi-code-json' },
  md: { text: 'Экспорт в Markdown', icon: 'mdi-language-markdown' },
  markdown: { text: 'Экспорт в Markdown', icon: 'mdi-language-markdown' }
}

function handleExport(format: ExportFormat = 'json'): void {
  mindmap.exportTree(format)
  const label = EXPORT_LABELS[format]
  notify(label.text, 'success', label.icon)
}

// ─── Import ──────────────────────────────────────────

async function handleImport(file: File): Promise<void> {
  try {
    await mindmap.importTree(file)
    const isMd = /\.(md|markdown)$/i.test(file.name)
    notify(`Импорт из ${isMd ? 'Markdown' : 'JSON'}`, 'success', 'mdi-upload')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка импорта'
    notify(message, 'error', 'mdi-alert')
  }
}

// ─── Layout ──────────────────────────────────────────

function handleAutoLayout(type: LayoutType): void {
  mindmap.autoLayout(type)
  const layout = LAYOUT_TYPES[type]
  notify(`Раскладка: ${layout.label}`, 'success', layout.icon)
}

function handleResetLayout(): void {
  mindmap.resetAllPositions()
  notify('Позиции сброшены', 'info', 'mdi-pin-off-outline')
}
</script>

<style>
html, body { overflow-y: auto; }
</style>