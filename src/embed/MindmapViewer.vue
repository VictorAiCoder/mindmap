<template>
  <div :class="props.class" :style="{ height: props.height ?? '600px' }">
    <MindMapCanvas
      v-if="mindmap"
      :api="mindmap"
      :embed="true"
      :show-notes="props.showNotes"
      :show-images="props.showImages"
      :layout="props.layout"
      :markdown="props.markdown"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, provide, watch } from 'vue'
import MindMapCanvas from './components/MindMapCanvas.vue'
import { useMindMapApi } from './composables/useMindMapApi'
import { mindMapKey } from './injection-keys'
import type { MindmapViewerProps } from './types'

const props = withDefaults(defineProps<MindmapViewerProps>(), {
  showNotes: true,
  showImages: true,
})

const mindmap = useMindMapApi(null, { persistence: false })

provide(mindMapKey, mindmap)
</script>
