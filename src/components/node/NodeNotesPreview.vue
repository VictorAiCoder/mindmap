<!-- src/components/node/NodeNotesPreview.vue -->
<template>
  <div
    class="notes-preview"
    :class="{ 'notes-preview--expanded': isHovered }"
    :style="{ borderLeftColor: color }"
    @click.stop="$emit('openNotes')"
    @mousedown.stop
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div
      v-if="!isHovered"
      class="notes-md markdown-mini"
      v-html="previewHtml"
    />

    <div
      v-else
      class="notes-md notes-md--full markdown-mini"
      v-html="fullHtml"
    />

    <div v-if="hasMore && !isHovered" class="notes-fade">
      <span class="notes-more">наведите чтобы развернуть…</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { renderMarkdown, getNotesPreview } from '../../composables/useMarkdown'

const props = defineProps({
  notes: { type: String, default: '' },
  color: { type: String, default: '#5C6BC0' }
})

defineEmits(['openNotes'])

const isHovered = ref(false)

const previewText = computed(() => getNotesPreview(props.notes))
const previewHtml = computed(() => renderMarkdown(previewText.value))
const fullHtml = computed(() => renderMarkdown(props.notes))

const hasMore = computed(() => {
  const n = props.notes || ''
  return n.split('\n').length > 7 || n.length > 400
})
</script>

<style scoped>
.notes-preview {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 6px;
  padding: 10px 14px;
  width: max-content;
  min-width: 180px;
  max-width: 280px;
  background: rgb(var(--v-theme-surface));
  border-left: 3px solid;
  border-radius: 0 8px 8px 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  z-index: 1;
  transition: all 0.25s ease;
  overflow: hidden;
}

.notes-preview:not(.notes-preview--expanded) {
  max-height: 160px;
}

.notes-preview--expanded {
  max-width: 380px;
  max-height: 500px;
  overflow-y: auto;
  z-index: 50;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  transform: translateY(2px);
}

.notes-preview--expanded::-webkit-scrollbar { width: 4px; }
.notes-preview--expanded::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

.notes-fade {
  position: relative;
  margin-top: -24px;
  padding-top: 24px;
  background: linear-gradient(to bottom, transparent, rgb(var(--v-theme-surface)) 70%);
  text-align: center;
}

.notes-more {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-style: italic;
}

/* Markdown мини-стили */
.markdown-mini {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.8);
  word-break: break-word;
}

.markdown-mini :deep(h1) { font-size: 1.15em; font-weight: 700; margin: 0.3em 0; }
.markdown-mini :deep(h2) { font-size: 1.1em; font-weight: 600; margin: 0.3em 0; }
.markdown-mini :deep(h3) { font-size: 1.05em; font-weight: 600; margin: 0.2em 0; }
.markdown-mini :deep(h4),
.markdown-mini :deep(h5),
.markdown-mini :deep(h6) { font-size: 1em; font-weight: 600; margin: 0.2em 0; }
.markdown-mini :deep(p) { margin: 0.3em 0; }
.markdown-mini :deep(ul),
.markdown-mini :deep(ol) { padding-left: 1.3em; margin: 0.2em 0; }
.markdown-mini :deep(li) { margin: 0.1em 0; }

.markdown-mini :deep(blockquote) {
  border-left: 2px solid rgba(var(--v-theme-primary), 0.4);
  padding: 0.2em 0.6em;
  margin: 0.3em 0;
  background: rgba(var(--v-theme-primary), 0.04);
  border-radius: 0 4px 4px 0;
  font-size: 0.95em;
}

.markdown-mini :deep(code) {
  background: rgba(var(--v-theme-on-surface), 0.07);
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Fira Code', monospace;
}

.markdown-mini :deep(pre) {
  background: rgba(var(--v-theme-on-surface), 0.05);
  padding: 8px 10px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.3em 0;
  font-size: 0.85em;
}

.markdown-mini :deep(pre code) { background: transparent; padding: 0; }
.markdown-mini :deep(a) { color: rgb(var(--v-theme-primary)); text-decoration: none; }
.markdown-mini :deep(strong) { font-weight: 700; }
.markdown-mini :deep(em) { font-style: italic; }

.markdown-mini :deep(hr) {
  border: none;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
  margin: 0.4em 0;
}

.markdown-mini :deep(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9em;
  margin: 0.3em 0;
}

.markdown-mini :deep(th),
.markdown-mini :deep(td) {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  padding: 3px 8px;
  text-align: left;
}

.markdown-mini :deep(img) {
  max-width: 100%;
  border-radius: 6px;
  margin: 0.3em 0;
}
</style>