<!-- embed/components/EmbedNotesPreview.vue — read-only notes hover-preview -->
<template>
  <div
    class="embed-notes-preview"
    :class="{
      'embed-notes-preview--expanded': isExpanded,
    }"
    :style="previewStyle"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div class="embed-notes-preview__content" v-html="renderedHtml" />

    <div v-if="!isExpanded && isLong" class="embed-notes-preview__fade">
      <span class="embed-notes-preview__more">…</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, toRef } from 'vue'
import { renderMarkdown } from '../lib/markdown'
import { useNodeDisplay } from '../src/entities/node/model/useNodeDisplay'
import type { LayoutPosition } from '../src/features/layout/model/types'

// ─── Props ────────────────────────────────────

interface Props {
  pos: LayoutPosition
  showNotes?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showNotes: true,
})

// ─── Display state ────────────────────────────

const { color } = useNodeDisplay(toRef(props, 'pos'))

const notes = computed<string>(() => props.pos.node.notes ?? '')

// ─── Expanded state (hover only) ──────────────

const isExpanded = ref<boolean>(false)
let hoverTimer: ReturnType<typeof setTimeout> | null = null

function onMouseEnter(): void {
  hoverTimer = setTimeout(() => {
    isExpanded.value = true
  }, 300)
}

function onMouseLeave(): void {
  if (hoverTimer) clearTimeout(hoverTimer)
  isExpanded.value = false
}

onBeforeUnmount(() => {
  if (hoverTimer) clearTimeout(hoverTimer)
})

// ─── Computed display ─────────────────────────

const isLong = computed<boolean>(
  () => notes.value.length > 200 || notes.value.split('\n').length > 5,
)

const previewStyle = computed(() => ({
  borderLeftColor: color.value,
}))

const renderedHtml = computed<string>(() => renderMarkdown(notes.value))
</script>

<style scoped>
.embed-notes-preview {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 0.429em;
  z-index: 1;
  transition: all 0.25s ease;
  padding: 0.714em 1em;
  width: max-content;
  max-width: 20em;
  background: #fff;
  border-left: 0.214em solid;
  border-radius: 0 0.571em 0.571em 0;
  box-shadow: 0 0.143em 0.857em rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-height: 11.429em;
}

.embed-notes-preview--expanded {
  max-width: 27.143em;
  max-height: 35.714em;
  overflow-y: auto;
  z-index: 50;
  box-shadow: 0 0.571em 2.286em rgba(0, 0, 0, 0.18);
  transform: translateX(-50%) translateY(0.143em);
}

.embed-notes-preview--expanded::-webkit-scrollbar {
  width: 0.286em;
}
.embed-notes-preview--expanded::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 0.286em;
}

.embed-notes-preview__content {
  cursor: default;
}

.embed-notes-preview__fade {
  position: relative;
  margin-top: -1.714em;
  padding-top: 1.714em;
  background: linear-gradient(to bottom, transparent, #fff 70%);
  text-align: center;
}

.embed-notes-preview__more {
  font-size: 0.714em;
  color: rgba(0, 0, 0, 0.4);
  font-style: italic;
}

/* ── Markdown mini-styles ─────────────────── */

.embed-notes-preview :deep(h1) { font-size: 1.15em; font-weight: 700; margin: 0.3em 0; }
.embed-notes-preview :deep(h2) { font-size: 1.1em; font-weight: 600; margin: 0.3em 0; }
.embed-notes-preview :deep(h3) { font-size: 1.05em; font-weight: 600; margin: 0.2em 0; }
.embed-notes-preview :deep(h4),
.embed-notes-preview :deep(h5),
.embed-notes-preview :deep(h6) { font-size: 1em; font-weight: 600; margin: 0.2em 0; }
.embed-notes-preview :deep(p) { margin: 0.3em 0; }
.embed-notes-preview :deep(ul),
.embed-notes-preview :deep(ol) { padding-left: 1.3em; margin: 0.2em 0; }
.embed-notes-preview :deep(li) { margin: 0.1em 0; }

.embed-notes-preview :deep(blockquote) {
  border-left: 0.143em solid rgba(98, 114, 164, 0.4);
  padding: 0.2em 0.6em;
  margin: 0.3em 0;
  background: rgba(98, 114, 164, 0.04);
  border-radius: 0 0.286em 0.286em 0;
  font-size: 0.95em;
}

.embed-notes-preview :deep(:not(pre) > code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 0.1em 0.35em;
  border-radius: 0.214em;
  font-size: 0.9em;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
  color: #e06c75;
}

.embed-notes-preview :deep(pre) {
  background: #6ce07927;
  padding: 0.714em 0.857em;
  border-radius: 0.429em;
  overflow-x: auto;
  margin: 0.5em 0;
  font-size: 0.857em;
  line-height: 1.45;
  border: 0.071em solid rgba(255, 255, 255, 0.06);
}

.embed-notes-preview :deep(pre code),
.embed-notes-preview :deep(pre code.hljs) {
  background: transparent;
  padding: 0;
  color: #abb2bf;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
  font-feature-settings: 'liga' 1, 'calt' 1;
  font-size: inherit;
}

.embed-notes-preview :deep(pre)::-webkit-scrollbar { height: 0.357em; }
.embed-notes-preview :deep(pre)::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.214em;
}
.embed-notes-preview :deep(pre)::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.embed-notes-preview :deep(a) { color: #6272a4; text-decoration: none; }
.embed-notes-preview :deep(a:hover) { text-decoration: underline; }
.embed-notes-preview :deep(strong) { font-weight: 700; }
.embed-notes-preview :deep(em) { font-style: italic; }

.embed-notes-preview :deep(hr) {
  border: none;
  border-top: 0.071em solid rgba(0, 0, 0, 0.1);
  margin: 0.4em 0;
}

.embed-notes-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9em;
  margin: 0.3em 0;
}

.embed-notes-preview :deep(th),
.embed-notes-preview :deep(td) {
  border: 0.071em solid rgba(0, 0, 0, 0.1);
  padding: 0.214em 0.571em;
  text-align: left;
}

.embed-notes-preview :deep(img) {
  max-width: 100%;
  border-radius: 0.429em;
  margin: 0.3em 0;
}
</style>
