<template>
  <div
    class="notes-preview"
    :class="{
      'notes-preview--collapsed': !visible,
      'notes-preview--expanded': visible && isExpanded,
      'notes-preview--pinned': visible && pinned
    }"
    :style="previewStyle"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- ═══ Свёрнутое состояние ═══ -->
    <div
      v-if="!visible"
      class="notes-collapsed-indicator"
      :style="{ borderColor: color }"
      @click.stop="$emit('toggleVisible')"
      title="Показать заметку"
    >
      <IconEyeCrossed />
    </div>

    <!-- ═══ Развёрнутое состояние ═══ -->
    <template v-else>
      <div class="notes-toolbar" @click.stop>
        <button
          class="notes-btn notes-eye-btn pa-2"
          :class="{ 'notes-btn--active': visible }"
          title="Свернуть заметку"
          @click.stop="$emit('toggleVisible')"
        >
          <IconEye />
        </button>

        <button
          class="notes-btn notes-pin-btn"
          :class="{ 'notes-btn--active-pin': pinned }"
          :title="pinned ? 'Открепить' : 'Закрепить'"
          @click.stop="onTogglePin"
        >
          <svg class="icon-pin" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/>
          </svg>
        </button>
      </div>

      <div class="notes-content" @click.stop="$emit('openNotes')">
        <div class="markdown-mini" v-html="renderedHtml" />

        <div v-if="!isExpanded && isLong" class="notes-fade">
          <span class="notes-more">...</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useNodeDisplay } from '@entities/node/model/useNodeDisplay'
import { useHoverExpansion } from '../composables/useHoverExpansion'
import { useAsyncMarkdown } from '../composables/useAsyncMarkdown'
import IconEyeCrossed from './icons/IconEyeCrossed.vue'
import IconEye from './icons/IconEye.vue'
import type { LayoutPosition } from '@features/layout'

// ─── Props / Emits ──────────────────────────

interface Props {
  pos: LayoutPosition
}

const props = defineProps<Props>()

const emit = defineEmits<{
  openNotes: []
  togglePin: []
  toggleVisible: []
}>()

// ─── Shared display state ───────────────────

const { node, color } = useNodeDisplay(toRef(props, 'pos'))

// ─── Local state ────────────────────────────

const pinned = computed<boolean>(() => !!node.value.notesPinned)
const notes = computed<string>(() => node.value.notes ?? '')
const visible = computed<boolean>(() => node.value.notesVisible !== false)

// ─── Computed display ───────────────────────

const isLong = computed<boolean>(
  () => notes.value.length > 200 || notes.value.split('\n').length > 5,
)

const previewStyle = computed(() => {
  if (!visible.value) return {}
  return { borderLeftColor: color.value }
})

// ─── Composables ────────────────────────────

const { isExpanded, onMouseEnter, onMouseLeave } = useHoverExpansion({
  enabled: visible,
  pinned,
})

const { renderedHtml } = useAsyncMarkdown(notes)

// ─── Handlers ───────────────────────────────

function onTogglePin(): void {
  emit('togglePin')
}

function onToggleVisible(): void {
  emit('toggleVisible')
}
</script>
<style scoped>
/* ── Корневой контейнер ── */
.notes-preview {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 0.429em;
  z-index: 1;
  transition: all 0.25s ease;
}

/* ── Свёрнутый режим ── */
.notes-preview--collapsed {
  padding: 0;
  background: none;
  border: none;
  box-shadow: none;
  overflow: visible;
}

.notes-collapsed-indicator {
  width: 2.571em;
  height: 2.571em;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  border: 0.143em solid;
  box-shadow: 0 0.143em 0.571em rgba(0, 0, 0, 0.1);
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.35);
  transition: all 0.2s ease;
}

.notes-collapsed-indicator:hover {
  color: rgba(var(--v-theme-on-surface), 0.7);
  box-shadow: 0 0.214em 0.857em rgba(0, 0, 0, 0.15);
  transform: scale(1.1);
}

/* ── Развёрнутый режим ── */
.notes-preview:not(.notes-preview--collapsed) {
  --enc-background: rgb(43 41 41 / 88%);
  padding: 0.714em 1em;
  padding-right: 1.714em;
  width: max-content;
  max-width: 20em;
  background: var(--enc-background);
  border-left: 0.214em solid;
  border-radius: 0 0.571em 0.571em 0;
  box-shadow: 0 0.143em 0.857em rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-height: 11.429em;
}

.notes-preview--expanded {
  max-width: 45em !important;
  max-height: 40em !important;
  overflow-y: auto !important;
  z-index: 50 !important;
  box-shadow: 0 0.571em 2.286em rgba(0, 0, 0, 0.18) !important;
  transform: translateX(-50%) translateY(0.143em);
}

.notes-preview--pinned {
  border-left-width: 0.286em;
  box-shadow: 0 0.286em 1.429em rgba(0, 0, 0, 0.14);
}

.notes-preview--expanded::-webkit-scrollbar { width: 0.286em; }
.notes-preview--expanded::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 0.286em;
}

/* ── Toolbar ── */
.notes-toolbar {
  margin-bottom: 0.571em;
  display: flex;
  gap: 0.143em;
  z-index: 10;
}

.notes-btn {
  width: 1.571em;
  height: 1.571em;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.286em;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.4);
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.icon-pin { width: 0.857em; height: 0.857em; }

.notes-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.12);
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.notes-btn--active-pin {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
  transform: rotate(45deg);
}

.notes-btn--active-pin:hover {
  background: rgba(var(--v-theme-primary), 0.2);
  color: rgb(var(--v-theme-primary));
}

.notes-content { cursor: pointer; }

.notes-fade {
  position: relative;
  margin-top: -1.714em;
  padding-top: 1.714em;
  background: linear-gradient(to bottom, transparent, rgb(var(--v-theme-surface)) 70%);
  text-align: center;
}

.notes-more {
  font-size: 0.714em;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-style: italic;

}

/* ── Markdown мини-стили ── */
.markdown-mini {
  font-size: 0.857em;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.8);
  word-break: break-word;
  width: 45em;
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
  border-left: 0.143em solid rgba(var(--v-theme-primary), 0.4);
  padding: 0.2em 0.6em;
  margin: 0.3em 0;
  background: rgba(var(--v-theme-primary), 0.04);
  border-radius: 0 0.286em 0.286em 0;
  font-size: 0.95em;
}

.markdown-mini :deep(:not(pre) > code) {
  background: rgba(var(--v-theme-on-surface), 0.08);
  padding: 0.1em 0.35em;
  border-radius: 0.214em;
  font-size: 0.9em;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
  color: #e06c75;
}

.markdown-mini :deep(pre) {
  background: #6ce07927;
  padding: 0.714em 0.857em;
  border-radius: 0.429em;
  overflow-x: auto;
  margin: 0.5em 0;
  font-size: 0.857em;
  line-height: 1.45;
  border: 0.071em solid rgba(255, 255, 255, 0.06);
}

.markdown-mini :deep(pre code),
.markdown-mini :deep(pre code.hljs) {
  background: transparent;
  padding: 0;
  color: #abb2bf;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
  font-feature-settings: 'liga' 1, 'calt' 1;
  font-size: inherit;
}

.markdown-mini :deep(pre)::-webkit-scrollbar { height: 0.357em; }
.markdown-mini :deep(pre)::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.214em;
}
.markdown-mini :deep(pre)::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.markdown-mini :deep(a) { color: rgb(var(--v-theme-primary)); text-decoration: none; }
.markdown-mini :deep(a:hover) { text-decoration: underline; }
.markdown-mini :deep(strong) { font-weight: 700; }
.markdown-mini :deep(em) { font-style: italic; }

.markdown-mini :deep(hr) {
  border: none;
  border-top: 0.071em solid rgba(var(--v-border-color), 0.2);
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
  border: 0.071em solid rgba(var(--v-border-color), 0.2);
  padding: 0.214em 0.571em;
  text-align: left;
}

.markdown-mini :deep(img) {
  max-width: 100%;
  border-radius: 0.429em;
  margin: 0.3em 0;
}

/* ── Mermaid diagram blocks ── */
.markdown-mini :deep(.mermaid) {
  background: #6ce07927;
  border: 0.071em solid rgba(255, 255, 255, 0.06);
  border-radius: 0.429em;
  padding: 0.5em;
  margin: 0.5em 0;
  overflow-x: auto;
  font-size: 1.2em;
}

.markdown-mini :deep(.mermaid svg) {
  max-width: 100%;
  height: auto;
}

.markdown-mini :deep(pre:has(code.language-mermaid)) {
  display: none;
}
</style>
