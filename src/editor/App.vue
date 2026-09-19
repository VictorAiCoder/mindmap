<!-- src/editor/App.vue — thin shell: wires composables to widgets -->
<template>
  <v-app :theme="theme">
    <ToolbarPanel
      :node-count="editor.nodeCount"
      :depth="editor.treeDepth"
      :can-undo="editor.canUndo"
      :can-redo="editor.canRedo"
      :is-dark="isDark"
      @toggle-gallery="galleryOpen = !galleryOpen"
      @export="editor.handleExport"
      @import="editor.handleImport"
      @reset="editor.resetToDefault"
      @undo="editor.undo"
      @redo="editor.redo"
      @toggle-theme="toggleTheme"
      @auto-layout="editor.handleAutoLayout"
      @reset-layout="editor.handleResetLayout"
      @toggle-embed="embed.toggle"
    />

    <v-main>
      <MindmapViewer
        :api="mindmap"
        :markdown="embed.embedMarkdown"
        :height="embed.isEmbedMode ? '100vh' : 'auto'"
        :class="{ 'mindmap-embed-fullscreen': embed.isEmbedMode }"
      >
        <MindMapCanvas
          :api="mindmap"
          :embed="embed.isEmbedMode"
          :gallery-open="embed.isEmbedMode ? false : galleryOpen"
        />
      </MindmapViewer>
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
      :title="embed.isEmbedMode ? 'Режим редактирования' : 'Режим просмотра'"
      @click="embed.toggle"
    >
      <v-icon :icon="embed.isEmbedMode ? 'mdi-pencil' : 'mdi-eye'" />
    </button>
  </v-app>
</template>

<script setup lang="ts">
import { ref, provide, defineAsyncComponent } from 'vue'
import ToolbarPanel from './toolbar/ToolbarPanel.vue'
import { useMindMapApi } from '../../embed/composables/useMindMapApi'
import { useTheme } from '../app/model/useTheme'
import { mindMapKey } from '../../embed/injection-keys'

import { useNotification } from './composables/useNotification'
import { useEditorActions } from './composables/useEditorActions'
import { useEmbedMode } from './composables/useEmbedMode'

const MindMapCanvas = defineAsyncComponent(() =>
  import('../../embed/components/MindMapCanvas.vue').then(m => m.default)
)

const MindmapViewer = defineAsyncComponent(() =>
  import('../../embed/MindmapViewer.vue').then(m => m.default)
)

// ─── Core ────────────────────────────────────────
const mindmap = useMindMapApi(null, { persistence: true })
provide(mindMapKey, mindmap)

// ─── Composables ─────────────────────────────────
const { notify, snackbar } = useNotification()
const editor = useEditorActions(mindmap, notify)
const embed = useEmbedMode(mindmap)
const { theme, isDark, toggle: toggleTheme } = useTheme()
const galleryOpen = ref(false)
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
