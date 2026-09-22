<template>
  <v-app :theme="theme">
    <ToolbarPanel
      :node-count="editor.nodeCount.value"
      :depth="editor.treeDepth.value"
      :can-undo="editor.canUndo.value"
      :can-redo="editor.canRedo.value"
      :is-dark="isDark"
      :is-embed="embed.isEmbedMode.value"
      :gallery-open="galleryOpen"
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
      <div
        class="mindmap-viewer"
        :class="{'mindmap-viewer--fullscreen': isFullscreen.value}"
      >
        <div v-if="isLoading" class="mindmap-viewer__loading">Загрузка…</div>
        <MindMapCanvas
          :api="mindmap"
          :embed="embed.isEmbedMode.value"
          :gallery-open="!embed.isEmbedMode.value && galleryOpen"
        />
      </div>
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
import { ref, provide, defineAsyncComponent } from 'vue'
import ToolbarPanel from './editor/toolbar/ToolbarPanel.vue'
import { useMindMapApi } from './embed/composables/useMindMapApi'
import { mindMapKey } from './embed/injection-keys'
import { useFullscreen } from './embed/composables/useFullscreen'
import { useMindMapData } from './embed/composables/useMindMapData'
import type { MindMapApi } from './embed/types/mindmap-api'
import { useTheme } from './app/model/useTheme'
import { useNotification } from './editor/composables/useNotification'
import { useEditorActions } from './editor/composables/useEditorActions'
import { useEmbedMode } from './editor/composables/useEmbedMode'

const MindMapCanvas = defineAsyncComponent(() =>
  import('./embed/components/MindMapCanvas.vue').then(m => m.default)
)

const mindmap = useMindMapApi(null, { persistence: true })
const { isFullscreen } = useFullscreen()
const { isLoading } = useMindMapData({
  api: mindmap as MindMapApi
})

provide(mindMapKey, mindmap)

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
.mindmap-viewer {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  position: relative;
}
.mindmap-viewer--fullscreen {
  position: fixed !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  border: none !important;
  border-radius: 0 !important;
  z-index: 9999;
  height: 100vh;
}
.mindmap-viewer__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-dim, #555);
  font-size: 0.85rem;
}
</style>
