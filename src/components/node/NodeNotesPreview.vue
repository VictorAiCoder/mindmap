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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    </div>

    <!-- ═══ Развёрнутое состояние ═══ -->
    <template v-else>
      <!-- Toolbar: eye + pin -->
      <div class="notes-toolbar" @click.stop>
        <button
          class="notes-btn notes-eye-btn"
          :class="{ 'notes-btn--active': visible }"
          title="Свернуть заметку"
          @click.stop="$emit('toggleVisible')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>

        <button
          class="notes-btn notes-pin-btn"
          :class="{ 'notes-btn--active-pin': pinned }"
          :title="pinned ? 'Открепить' : 'Закрепить'"
          @click.stop="onTogglePin"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/>
          </svg>
        </button>
      </div>

      <!-- Content area — кликабельно для открытия -->
      <div class="notes-content" @click.stop="$emit('openNotes')">
        <div class="markdown-mini" v-html="renderedHtml" />

        <div v-if="!isExpanded && isLong" class="notes-fade">
          <span class="notes-more">...</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  notes:   { type: String, default: '' },
  color:   { type: String, default: '#5C6BC0' },
  pinned:  { type: Boolean, default: false },
  visible: { type: Boolean, default: true }
})

const emit = defineEmits(['openNotes', 'togglePin', 'toggleVisible'])

// ── isExpanded синхронизируется с pinned ──
const isExpanded = ref(props.pinned)

watch(() => props.pinned, (val) => {
  if (val) isExpanded.value = true
})

// Когда visible включается обратно — восстанавливаем expanded если pinned
watch(() => props.visible, (val) => {
  if (val && props.pinned) {
    isExpanded.value = true
  }
})

const isLong = computed(() =>
  props.notes.length > 200 || props.notes.split('\n').length > 5
)

const previewStyle = computed(() => {
  if (!props.visible) return {}
  return { borderLeftColor: props.color }
})

const renderedHtml = computed(() => {
  try {
    return marked.parse(props.notes, { breaks: true, gfm: true })
  } catch {
    return `<p>${props.notes}</p>`
  }
})

// ── Pin toggle с синхронизацией expanded ──
function onTogglePin() {
  // Если сейчас pinned=true и мы открепляем → оставляем expanded как есть (mouseLeave разберётся)
  // Если pinned=false и мы закрепляем → ставим expanded=true
  if (!props.pinned) {
    isExpanded.value = true
  }
  emit('togglePin')
}

// ── Hover logic ──
let hoverTimer = null

function onMouseEnter() {
  if (!props.visible || props.pinned) return
  hoverTimer = setTimeout(() => { isExpanded.value = true }, 300)
}

function onMouseLeave() {
  clearTimeout(hoverTimer)
  if (!props.pinned) isExpanded.value = false
}
</script>

<style scoped>
/* ── Корневой контейнер ── */
.notes-preview {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 6px;
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
  color: rgba(var(--v-theme-on-surface), 0.35);
  transition: all 0.2s ease;
}

.notes-collapsed-indicator:hover {
  color: rgba(var(--v-theme-on-surface), 0.7);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
  transform: scale(1.1);
}

/* ── Развёрнутый режим (не collapsed) ── */
.notes-preview:not(.notes-preview--collapsed) {
  padding: 10px 14px;
  padding-right: 52px;
  width: max-content;
  max-width: 280px;
  background: rgb(var(--v-theme-surface));
  border-left: 3px solid;
  border-radius: 0 8px 8px 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-height: 160px;
}

.notes-preview--expanded {
  max-width: 380px !important;
  max-height: 500px !important;
  overflow-y: auto !important;
  z-index: 50 !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18) !important;
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

/* ── Toolbar (eye + pin) ── */
.notes-toolbar {
  /* position: absolute; */
  /* top: 6px; */
  /* right: 6px; */
  margin-bottom: 8px;
  display: flex;
  gap: 2px;
  z-index: 10;
}

.notes-btn {
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
  padding: 0;
}

.notes-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.12);
  color: rgba(var(--v-theme-on-surface), 0.7);
}

/* Pin active */
.notes-btn--active-pin {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
  transform: rotate(45deg);
}

.notes-btn--active-pin:hover {
  background: rgba(var(--v-theme-primary), 0.2);
  color: rgb(var(--v-theme-primary));
}

/* ── Content area ── */
.notes-content {
  cursor: pointer;
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