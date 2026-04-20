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
      <svg 
        class="icon-eye-crossed" 
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        >
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
          class="notes-btn notes-eye-btn  pa-2"
          :class="{ 'notes-btn--active': visible }"
          title="Свернуть заметку"
          @click.stop="$emit('toggleVisible')"
        >
          <svg 
            class="icon-eye" 
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            >
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
          <svg 
            class="icon-pin" 
            viewBox="0 0 24 24" fill="currentColor"
            >
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

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { renderMarkdown } from '@/composables/useMarkdown'

interface Props {
  notes?: string
  color?: string
  pinned?: boolean
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  notes: '',
  color: '#5C6BC0',
  pinned: false,
  visible: true,
})

const emit = defineEmits<{
  openNotes: []
  togglePin: []
  toggleVisible: []
}>()

// ── isExpanded синхронизируется с pinned ──
const isExpanded = ref(props.pinned)

watch(() => props.pinned, (val) => {
  if (val) isExpanded.value = true
})

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

// ✅ Единый рендерер markdown с hljs + DOMPurify
const renderedHtml = computed(() => renderMarkdown(props.notes))

function onTogglePin() {
  if (!props.pinned) {
    isExpanded.value = true
  }
  emit('togglePin')
}

// ── Hover logic ──
let hoverTimer: ReturnType<typeof setTimeout> | null = null

function onMouseEnter() {
  if (!props.visible || props.pinned) return
  hoverTimer = setTimeout(() => { isExpanded.value = true }, 300)
}

function onMouseLeave() {
  if (hoverTimer) clearTimeout(hoverTimer)
  if (!props.pinned) isExpanded.value = false
}

onBeforeUnmount(() => {
  if (hoverTimer) clearTimeout(hoverTimer)
})
</script>

<style scoped>
/* ── Корневой контейнер ── */
.notes-preview {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 0.429em;          /* 6px */
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
  width: 2.571em;               /* 36px */
  height: 2.571em;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  border: 0.143em solid;        /* 2px */
  box-shadow: 0 0.143em 0.571em rgba(0, 0, 0, 0.1);  /* 2px 8px */
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.35);
  transition: all 0.2s ease;
}

.icon-eye-crossed {
  width: 1.429em;               /* 20px */
  height: 1.429em;
}

.notes-collapsed-indicator:hover {
  color: rgba(var(--v-theme-on-surface), 0.7);
  box-shadow: 0 0.214em 0.857em rgba(0, 0, 0, 0.15);  /* 3px 12px */
  transform: scale(1.1);
}

/* ── Развёрнутый режим ── */
.notes-preview:not(.notes-preview--collapsed) {
  padding: 0.714em 1em;         /* 10px 14px */
  padding-right: 3.714em;       /* 52px */
  width: max-content;
  max-width: 20em;              /* 280px */
  background: rgb(var(--v-theme-surface));
  border-left: 0.214em solid;   /* 3px */
  border-radius: 0 0.571em 0.571em 0;  /* 8px */
  box-shadow: 0 0.143em 0.857em rgba(0, 0, 0, 0.1);  /* 2px 12px */
  overflow: hidden;
  max-height: 11.429em;         /* 160px */
}

.notes-preview--expanded {
  max-width: 27.143em !important;   /* 380px */
  max-height: 35.714em !important;  /* 500px */
  overflow-y: auto !important;
  z-index: 50 !important;
  box-shadow: 0 0.571em 2.286em rgba(0, 0, 0, 0.18) !important;  /* 8px 32px */
  transform: translateX(-50%) translateY(0.143em);  /* 2px */
}

.notes-preview--pinned {
  border-left-width: 0.286em;   /* 4px */
  box-shadow: 0 0.286em 1.429em rgba(0, 0, 0, 0.14);  /* 4px 20px */
}

.notes-preview--expanded::-webkit-scrollbar { width: 0.286em; }  /* 4px */
.notes-preview--expanded::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 0.286em;
}

/* ── Toolbar ── */
.notes-toolbar {
  margin-bottom: 0.571em;       /* 8px */
  display: flex;
  gap: 0.143em;                 /* 2px */
  z-index: 10;
}

.notes-btn {
  width: 1.571em;               /* 22px */
  height: 1.571em;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.286em;       /* 4px */
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.4);
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.icon-eye {
  width: 1em;                   /* 14px */
  height: 1em;
}

.icon-pin {
  width: 0.857em;               /* 12px */
  height: 0.857em;
}

/* (остальные :hover и active — не трогаем, там только color/background) */

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

/* ── Content area ── */
.notes-content {
  cursor: pointer;
}

/* ── Fade & more ── */
.notes-fade {
  position: relative;
  margin-top: -1.714em;         /* -24px */
  padding-top: 1.714em;
  background: linear-gradient(to bottom, transparent, rgb(var(--v-theme-surface)) 70%);
  text-align: center;
}

.notes-more {
  font-size: 0.714em;           /* 10px */
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-style: italic;
}

/* ── Markdown мини-стили ── */
.markdown-mini {
  font-size: 0.857em;           /* 12px */
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.8);
  word-break: break-word;
}

/* h1..h6, p, ul, ol, li, blockquote — уже в em, НЕ ТРОГАЕМ */

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
  border-left: 0.143em solid rgba(var(--v-theme-primary), 0.4);  /* 2px */
  padding: 0.2em 0.6em;
  margin: 0.3em 0;
  background: rgba(var(--v-theme-primary), 0.04);
  border-radius: 0 0.286em 0.286em 0;  /* 4px */
  font-size: 0.95em;
}

.markdown-mini :deep(:not(pre) > code) {
  background: rgba(var(--v-theme-on-surface), 0.08);
  padding: 0.1em 0.35em;
  border-radius: 0.214em;       /* 3px */
  font-size: 0.9em;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
  color: #e06c75;
}

.markdown-mini :deep(pre) {
  background: #6ce07927;
  padding: 0.714em 0.857em;     /* 10px 12px */
  border-radius: 0.429em;       /* 6px */
  overflow-x: auto;
  margin: 0.5em 0;
  font-size: 0.857em;           /* 12px */
  line-height: 1.45;
  border: 0.071em solid rgba(255, 255, 255, 0.06);  /* 1px */
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

.markdown-mini :deep(pre)::-webkit-scrollbar { height: 0.357em; }  /* 5px */
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
  border-top: 0.071em solid rgba(var(--v-border-color), 0.2);  /* 1px */
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
  padding: 0.214em 0.571em;     /* 3px 8px */
  text-align: left;
}

.markdown-mini :deep(img) {
  max-width: 100%;
  border-radius: 0.429em;       /* 6px */
  margin: 0.3em 0;
}
</style>