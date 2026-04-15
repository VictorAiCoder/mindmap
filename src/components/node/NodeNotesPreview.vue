<template>
  <!-- Свёрнутое состояние — только иконка закрытого глаза -->
  <div v-if="!visible" class="notes-preview" style="max-width: 50px !important; height: 50px;">
    <br>
    <div
      
      class="notes-collapsed-indicator"
      :style="{ borderColor: color }"
      @click.stop="$emit('toggleVisible')"
      title="Показать заметку"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    </div>
  </div>
  <div
    v-if="!visible"
    class="notes-collapsed-indicator"
    :style="{ borderColor: color }"
    @click.stop="$emit('toggleVisible')"
    title="Показать заметку"
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  </div>

  <!-- Развёрнутое состояние — полное превью -->
  <div
    v-else
    class="notes-preview"
    :class="{
      'notes-preview--expanded': isExpanded,
      'notes-preview--pinned': pinned
    }"
    :style="{ borderLeftColor: color }"
    @click.stop="$emit('openNotes')"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- Кнопка видимости (глаз) -->
    <button
      class="notes-eye-btn"
      :class="{ 'notes-eye-btn--active': visible }"
      title="Свернуть заметку"
      @click.stop="$emit('toggleVisible')"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </button>

    <!-- Кнопка Pin -->
    <button
      class="notes-pin-btn"
      :class="{ 'notes-pin-btn--active': pinned }"
      :title="pinned ? 'Открепить' : 'Закрепить'"
      @click.stop="$emit('togglePin')"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
      </svg>
    </button>

    <!-- Контент -->
    <div class="markdown-mini" v-html="renderedHtml" />

    <!-- Fade если контент обрезан -->
    <div v-if="!isExpanded && isLong" class="notes-fade">
      <span class="notes-more">...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  notes:   { type: String, default: '' },
  color:   { type: String, default: '#5C6BC0' },
  pinned:  { type: Boolean, default: false },
  visible: { type: Boolean, default: true }
})

defineEmits(['openNotes', 'togglePin', 'toggleVisible'])

const isExpanded = ref(false)
const isLong = computed(() => props.notes.length > 200 || props.notes.split('\n').length > 5)

const renderedHtml = computed(() => {
  try {
    return marked.parse(props.notes, { breaks: true, gfm: true })
  } catch {
    return `<p>${props.notes}</p>`
  }
})

let hoverTimer = null

function onMouseEnter() {
  if (props.pinned) return
  hoverTimer = setTimeout(() => { isExpanded.value = true }, 300)
}

function onMouseLeave() {
  clearTimeout(hoverTimer)
  if (!props.pinned) isExpanded.value = false
}
</script>

<style scoped>
/* ── Свёрнутый индикатор (закрытый глаз) ── */
.notes-collapsed-indicator {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  border: 2px solid;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  z-index: 1;
  color: rgba(var(--v-theme-on-surface), 0.35);
  transition: all 0.2s ease;
}

.notes-collapsed-indicator:hover {
  color: rgba(var(--v-theme-on-surface), 0.7);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
  transform: translateX(-50%) scale(1.1);
}

/* ── Развёрнутое превью ── */
.notes-preview {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 6px;
  padding: 10px 14px;
  padding-right: 52px;           /* место под 2 кнопки */
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
  transform: translateX(-50%) translateY(2px);
}

.notes-preview--pinned {
  border-left-width: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.14);
}

.notes-preview--expanded::-webkit-scrollbar { width: 4px; }
.notes-preview--expanded::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

/* ── Eye button ── */
.notes-eye-btn {
  position: absolute;
  top: 6px;
  right: 28px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.4);
  cursor: pointer;
  transition: all 0.15s ease;
  z-index: 10;
  padding: 0;
}

.notes-eye-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.12);
  color: rgba(var(--v-theme-on-surface), 0.7);
}

/* ── Pin button ── */
.notes-pin-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.4);
  cursor: pointer;
  transition: all 0.15s ease;
  z-index: 10;
  padding: 0;
}

.notes-pin-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.12);
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.notes-pin-btn--active {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
  transform: rotate(45deg);
}

.notes-pin-btn--active:hover {
  background: rgba(var(--v-theme-primary), 0.2);
  color: rgb(var(--v-theme-primary));
}

/* ── Fade & more ── */
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

/* ── Markdown мини-стили ── */
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