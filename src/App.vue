<template>
  <v-app>
    <v-main>
      <div class="mindmap-viewer" :class="{'mindmap-viewer--fullscreen': isFullscreen.value}">
        <div v-if="isLoading" class="mindmap-viewer__loading">Загрузка…</div>
        <MindMapCanvas :api="mindmap" :embed="false" />
      </div>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { provide, defineAsyncComponent } from 'vue'
import { useMindMapApi } from './embed/composables/useMindMapApi'
import { mindMapKey } from './embed/injection-keys'
import { useFullscreen } from './embed/composables/useFullscreen'
import { useMindMapData } from './embed/composables/useMindMapData'
import type { MindMapApi } from './embed/types/mindmap-api'

const MindMapCanvas = defineAsyncComponent(() =>
  import('./embed/components/MindMapCanvas.vue').then(m => m.default)
)

const mindmap = useMindMapApi(null, { persistence: true })
const { isFullscreen } = useFullscreen()
const { isLoading } = useMindMapData({
  api: mindmap as MindMapApi
})

provide(mindMapKey, mindmap)
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
