<!-- src/components/panels/NotesPanel.vue -->
<template>
  <v-navigation-drawer
    :model-value="!!nodeId"
    location="right"
    :width="viewMode=='split'?800:520"
    temporary
    @update:model-value="onDrawerUpdate"
  >
    <template v-if="node">
      <div class="notes-container" @pointerdown.stop @mousedown.stop @wheel.stop>
        <v-toolbar density="compact" color="transparent" flat class="notes-toolbar-header">
          
          <v-spacer />
          <v-btn-toggle v-model="viewMode" density="compact" mandatory variant="outlined" divided class="flex-shrink-0">
            <v-btn value="edit" size="small">
              <v-icon icon="mdi-pencil" size="16" />
            </v-btn>
            <v-btn value="preview" size="small">
              <v-icon icon="mdi-eye" size="16" />
            </v-btn>
            <v-btn value="split" size="small">
              <v-icon icon="mdi-view-split-vertical" size="16" />
            </v-btn>
          </v-btn-toggle>
          <v-btn icon="mdi-close" size="small" variant="text" class="ml-1 flex-shrink-0" @click="close" />
        </v-toolbar>

        <div class="notes-toolbar-title">
            <v-icon icon="mdi-text-box-outline" size="18" class="flex-shrink-0 mx-4" />
            <span>{{ node.text }}</span>
          </div>

        <v-divider />

        <NotesToolbar
          v-if="viewMode !== 'preview'"
          @action="insertMarkdown"
        />

        <div class="notes-body">
          <!-- Только редактор -->
          <v-textarea
            v-if="viewMode === 'edit'"
            ref="textareaRef"
            v-model="localNotes"
            variant="plain"
            auto-grow
            hide-details
            placeholder="Введите заметку в формате Markdown..."
            class="notes-textarea"
            @update:model-value="onNotesChange"
          />

          <!-- Только превью -->
          <div
            v-else-if="viewMode === 'preview'"
            class="notes-preview markdown-body"
            v-html="renderedHtml"
          />

          <!-- Сплит: редактор + превью -->
          <template v-else>
            <div class="notes-split">
              <v-textarea
                ref="textareaRef"
                v-model="localNotes"
                variant="plain"
                auto-grow
                hide-details
                placeholder="Markdown..."
                class="notes-textarea notes-textarea--split"
                @update:model-value="onNotesChange"
              />
              <v-divider vertical />
              <div
                class="notes-preview notes-preview--split markdown-body"
                v-html="renderedHtml"
              />
            </div>
          </template>
        </div>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed, watch, nextTick, inject } from 'vue'
import { renderMarkdown } from '../../composables/useMarkdown'
import { findNodeById } from '../../composables/tree/useTreeTraversal'
import { mindMapKey } from '../../types/injection-keys'
import NotesToolbar from './NotesToolbar.vue'

const props = defineProps({
  nodeId: { type: String, default: null }
})

const emit = defineEmits(['close'])

const mindmap = inject(mindMapKey, null)

const viewMode = ref('split')
const localNotes = ref('')
const textareaRef = ref(null)

// --- Текущий узел ---

const node = computed(() => {
  if (!props.nodeId || !mindmap?.rootNode?.value) return null
  return findNodeById(mindmap.rootNode.value, props.nodeId)
})

// --- Синхронизация ---

watch(() => props.nodeId, (id) => {
  if (id && node.value) {
    localNotes.value = node.value.notes || ''
    nextTick(() => focusTextarea())
  }
})

watch(node, (n) => {
  if (n && n.notes !== localNotes.value) {
    localNotes.value = n.notes || ''
  }
}, { deep: true })

// --- Рендер ---

const renderedHtml = computed(() => renderMarkdown(localNotes.value))

// --- Обновление ---

function onNotesChange(value) {
  if (props.nodeId && mindmap) {
    mindmap.updateNotes(props.nodeId, value)
  }
}

// --- Вставка markdown-разметки ---

function insertMarkdown(action) {
  const textarea = getTextareaElement()
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = localNotes.value
  const selected = text.substring(start, end)

  const insertions = {
    bold: { before: '**', after: '**', placeholder: 'жирный' },
    italic: { before: '_', after: '_', placeholder: 'курсив' },
    code: { before: '`', after: '`', placeholder: 'код' },
    codeblock: { before: '```\n', after: '\n```', placeholder: 'код' },
    link: { before: '[', after: '](url)', placeholder: 'ссылка' },
    image: { before: '![', after: '](url)', placeholder: 'описание' },
    h1: { before: '# ', after: '', placeholder: 'Заголовок' },
    h2: { before: '## ', after: '', placeholder: 'Заголовок' },
    h3: { before: '### ', after: '', placeholder: 'Заголовок' },
    ul: { before: '- ', after: '', placeholder: 'пункт' },
    ol: { before: '1. ', after: '', placeholder: 'пункт' },
    quote: { before: '> ', after: '', placeholder: 'цитата' },
    hr: { before: '\n---\n', after: '', placeholder: '' },
    table: {
      before: '| Колонка 1 | Колонка 2 |\n| --- | --- |\n| ',
      after: ' | значение |',
      placeholder: 'значение'
    }
  }

  const ins = insertions[action]
  if (!ins) return

  const content = selected || ins.placeholder
  const newText = text.substring(0, start) + ins.before + content + ins.after + text.substring(end)

  localNotes.value = newText
  onNotesChange(newText)

  nextTick(() => {
    const newStart = start + ins.before.length
    const newEnd = newStart + content.length
    textarea.focus()
    textarea.setSelectionRange(newStart, newEnd)
  })
}

// --- Утилиты ---

function getTextareaElement() {
  const comp = textareaRef.value
  if (!comp) return null
  return comp.$el?.querySelector('textarea') || null
}

function focusTextarea() {
  if (viewMode.value !== 'preview') {
    getTextareaElement()?.focus()
  }
}

function close() {
  emit('close')
}

function onDrawerUpdate(val) {
  if (!val) close()
}
</script>

<style scoped>
.notes-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  cursor: auto;
}

.notes-toolbar-header {
  height: auto !important;
  min-height: 48px;
}

.notes-toolbar-header :deep(.v-toolbar__content) {
  height: auto !important;
  min-height: 48px;
  padding-top: 8px;
  padding-bottom: 8px;
  align-items: flex-start;
}

.notes-toolbar-title {
  display: flex;
  align-items: flex-start;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
  word-break: break-word;
  white-space: normal;
  padding-right: 12px;
  padding-bottom: 12px;
}

.notes-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.notes-textarea {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.notes-textarea :deep(textarea) {
  min-height: 300px !important;
}

.notes-split {
  display: flex;
  gap: 0;
  height: 100%;
  min-height: 400px;
}

.notes-textarea--split {
  flex: 1;
  min-width: 0;
}

.notes-textarea--split :deep(textarea) {
  min-height: 400px !important;
}

.notes-preview {
  padding: 8px 0;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.notes-preview--split {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  overflow-y: auto;
}

/* Markdown стили */
.markdown-body :deep(h1) { font-size: 1.5em; font-weight: 700; margin: 0.5em 0 0.3em; border-bottom: 1px solid rgba(var(--v-border-color), 0.2); padding-bottom: 0.2em; }
.markdown-body :deep(h2) { font-size: 1.3em; font-weight: 600; margin: 0.5em 0 0.3em; }
.markdown-body :deep(h3) { font-size: 1.15em; font-weight: 600; margin: 0.4em 0 0.2em; }
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) { font-size: 1em; font-weight: 600; margin: 0.3em 0 0.2em; }
.markdown-body :deep(p) { margin: 0.5em 0; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) { padding-left: 1.5em; margin: 0.4em 0; }
.markdown-body :deep(li) { margin: 0.2em 0; }

.markdown-body :deep(blockquote) {
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  padding: 0.4em 1em;
  margin: 0.5em 0;
  background: rgba(var(--v-theme-primary), 0.04);
  border-radius: 0 6px 6px 0;
}

.markdown-body :deep(code) {
  background: rgba(var(--v-theme-on-surface), 0.08);
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'Fira Code', monospace;
}

.markdown-body :deep(pre) {
  background: rgba(var(--v-theme-on-surface), 0.06);
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-body :deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(strong) { font-weight: 700; }
.markdown-body :deep(em) { font-style: italic; }

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid rgba(var(--v-border-color), 0.3);
  margin: 1em 0;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid rgba(var(--v-border-color), 0.3);
  padding: 6px 12px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-weight: 600;
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 0.5em 0;
}
</style>