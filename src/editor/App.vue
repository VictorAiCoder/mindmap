<!-- src/editor/App.vue — thin shell: wires embed composables to widgets -->
<template>
  <v-app :theme="theme">
    <ToolbarPanel
      :node-count="nodeCount"
      :depth="treeDepth"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :is-dark="isDark"
      @toggle-gallery="galleryOpen = !galleryOpen"
      @export="handleExport"
      @import="handleImport"
      @reset="resetToDefault"
      @undo="undo"
      @redo="redo"
      @toggle-theme="toggleTheme"
      @auto-layout="handleAutoLayout"
      @reset-layout="handleResetLayout"
      @toggle-embed="toggleEmbedMode"
    />

    <v-main>
      <MindMapCanvas
        v-if="mindmap && !isEmbedMode"
        :api="mindmap"
        :gallery-open="galleryOpen"
        :notify="notify"
      />
      <MindmapViewer
        v-else-if="isEmbedMode"
        :markdown="embedMarkdown"
        height="100vh"
        class="mindmap-embed-fullscreen"
      />
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

    <button
      class="embed-toggle-btn"
      :title="isEmbedMode ? 'Режим редактирования' : 'Режим просмотра'"
      @click="toggleEmbedMode"
    >
      <v-icon :icon="isEmbedMode ? 'mdi-pencil' : 'mdi-eye'" />
    </button>
  </v-app>
</template>

<script setup lang="ts">
import { ref, provide, defineAsyncComponent } from 'vue'
import ToolbarPanel from './toolbar/ToolbarPanel.vue'
import { useMindMapApi } from '../../embed/composables/useMindMapApi'
import { useTheme } from '../app/model/useTheme'
import { LAYOUT_TYPES } from '@features/layout'
import {
  mindMapKey,
  notifyKey,
  type NotifyFn,
  type NotifyColor,
} from '../../embed/injection-keys'
import type { LayoutType, ExportFormat } from '../../embed/types/mindmap-api'

const MindMapCanvas = defineAsyncComponent(() =>
  import('../../embed/components/MindMapCanvas.vue').then(m => m.default)
)

const MindmapViewer = defineAsyncComponent(() =>
  import('../../embed/MindmapViewer.vue').then(m => m.default)
)

// ─── Core ────────────────────────────────────────
const mindmap = useMindMapApi(null, { persistence: true })
const galleryOpen = ref(false)
const isEmbedMode = ref(false)
const embedMarkdown = ref('')

provide(mindMapKey, mindmap)

const {
  nodeCount, treeDepth, canUndo, canRedo,
  undo, redo, resetToDefault, autoLayout, resetAllPositions, exportTree,
} = mindmap

// ─── Theme ───────────────────────────────────────
const { theme, isDark, toggle: toggleTheme } = useTheme()

// ─── Snackbar ────────────────────────────────────
interface SnackbarState {
  show: boolean
  text: string
  color: NotifyColor
  icon: string
}

const snackbar = ref<SnackbarState>({
  show: false,
  text: '',
  color: 'success',
  icon: 'mdi-check',
})

const notify: NotifyFn = (text, color = 'success', icon = 'mdi-check') => {
  snackbar.value = { show: true, text, color, icon }
}
provide(notifyKey, notify)

// ─── Export ──────────────────────────────────────
const EXPORT_LABELS: Record<ExportFormat, { text: string; icon: string }> = {
  json: { text: 'Экспорт в JSON', icon: 'mdi-code-json' },
  md: { text: 'Экспорт в Markdown', icon: 'mdi-language-markdown' },
  markdown: { text: 'Экспорт в Markdown', icon: 'mdi-language-markdown' },
}

function handleExport(format: ExportFormat = 'json'): void {
  exportTree(format)
  const label = EXPORT_LABELS[format]
  notify(label.text, 'success', label.icon)
}

// ─── Import ──────────────────────────────────────
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

// ─── Layout ──────────────────────────────────────
function handleAutoLayout(type: LayoutType): void {
  autoLayout(type)
  const layout = LAYOUT_TYPES[type]
  notify(`Раскладка: ${layout.label}`, 'success', layout.icon)
}

function handleResetLayout(): void {
  resetAllPositions()
  notify('Позиции сброшены', 'info', 'mdi-pin-off-outline')
}

// ─── Embed mode ──────────────────────────────────
function suppressDownload(fn: () => string): string {
  const orig = URL.createObjectURL
  URL.createObjectURL = () => ''
  try {
    return fn()
  } finally {
    URL.createObjectURL = orig
  }
}

function toggleEmbedMode(): void {
  if (!isEmbedMode.value) {
    embedMarkdown.value = suppressDownload(() => mindmap.exportTree('markdown'))
  }
  isEmbedMode.value = !isEmbedMode.value
}
</script>

<style>
html, body { overflow-y: auto; }

body.mindmap-dragging-image .v-overlay__scrim,
body.mindmap-dragging-image .v-navigation-drawer__scrim,
body.mindmap-dragging-image .v-overlay--active > .v-overlay__scrim {
  pointer-events: none !important;
  opacity: 0 !important;
  transition: opacity 0.15s;
}

.embed-toggle-btn {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(8px);
}

.embed-toggle-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
  transform: scale(1.05);
}

.mindmap-embed-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 100;
  border: none !important;
  border-radius: 0 !important;
}
</style>
