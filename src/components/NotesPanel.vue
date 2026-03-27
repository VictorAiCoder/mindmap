<!-- src/components/NotesPanel.vue -->
<template>
  <v-navigation-drawer
    :model-value="!!nodeId"
    location="right"
    :width="mode === 'split' ? 900 : 420"
    temporary
    @update:model-value="onClose"
  >
    <template v-if="node">
      <!-- Заголовок -->
      <v-toolbar color="transparent" density="compact">
        <v-icon
          :icon="node.image ? 'mdi-note-text' : 'mdi-text-box-outline'"
          class="ml-4"
          :color="node.color"
        />
        <v-toolbar-title class="text-body-1 font-weight-medium">
          {{ node.text }}
        </v-toolbar-title>
        <template #append>
          <!-- Переключатель режима -->
          <v-btn-toggle v-model="mode" mandatory density="compact" class="mr-2">
            <v-btn value="edit" size="small" icon="mdi-pencil" />
            <v-btn value="preview" size="small" icon="mdi-eye" />
            <v-btn value="split" size="small" icon="mdi-view-split-vertical" />
          </v-btn-toggle>
          <v-btn icon="mdi-close" variant="text" size="small" @click="onClose" />
        </template>
      </v-toolbar>

      <v-divider />

      <div class="notes-body">
        <!-- Режим: Редактор -->
        <div
          v-if="mode === 'edit' || mode === 'split'"
          class="notes-editor"
          :class="{ 'notes-editor--half': mode === 'split' }"
        >
          <!-- Toolbar markdown -->
          <div class="notes-toolbar">
            <v-btn size="x-small" variant="text" icon="mdi-format-bold"
              @click="insertFormat('**', '**')" title="Жирный" />
            <v-btn size="x-small" variant="text" icon="mdi-format-italic"
              @click="insertFormat('*', '*')" title="Курсив" />
            <v-btn size="x-small" variant="text" icon="mdi-format-strikethrough-variant"
              @click="insertFormat('~~', '~~')" title="Зачёркнутый" />
            <v-btn size="x-small" variant="text" icon="mdi-code-tags"
              @click="insertFormat('`', '`')" title="Код" />
            <v-divider vertical class="mx-1" />
            <v-btn size="x-small" variant="text" icon="mdi-format-header-1"
              @click="insertLine('# ')" title="Заголовок 1" />
            <v-btn size="x-small" variant="text" icon="mdi-format-header-2"
              @click="insertLine('## ')" title="Заголовок 2" />
            <v-btn size="x-small" variant="text" icon="mdi-format-header-3"
              @click="insertLine('### ')" title="Заголовок 3" />
            <v-divider vertical class="mx-1" />
            <v-btn size="x-small" variant="text" icon="mdi-format-list-bulleted"
              @click="insertLine('- ')" title="Список" />
            <v-btn size="x-small" variant="text" icon="mdi-format-list-numbered"
              @click="insertLine('1. ')" title="Нумерованный" />
            <v-btn size="x-small" variant="text" icon="mdi-format-list-checks"
              @click="insertLine('- [ ] ')" title="Чеклист" />
            <v-divider vertical class="mx-1" />
            <v-btn size="x-small" variant="text" icon="mdi-link"
              @click="insertFormat('[', '](url)')" title="Ссылка" />
            <v-btn size="x-small" variant="text" icon="mdi-format-quote-close"
              @click="insertLine('> ')" title="Цитата" />
            <v-btn size="x-small" variant="text" icon="mdi-code-braces"
              @click="insertBlock('```\n', '\n```')" title="Блок кода" />
          </div>

          <textarea
            ref="textareaRef"
            class="notes-textarea"
            :value="draft"
            placeholder="Введите заметку в формате Markdown…"
            spellcheck="true"
            @input="onInput"
            @keydown.tab.prevent="insertTab"
          />
        </div>

        <!-- Разделитель в split-режиме -->
        <v-divider v-if="mode === 'split'" vertical />

        <!-- Режим: Превью -->
        <div
          v-if="mode === 'preview' || mode === 'split'"
          class="notes-preview"
          :class="{ 'notes-preview--half': mode === 'split' }"
        >
          <div
            v-if="renderedHtml"
            class="markdown-body"
            v-html="renderedHtml"
          />
          <div v-else class="notes-empty">
            <v-icon icon="mdi-text-box-outline" size="48" color="grey-lighten-1" />
            <p class="text-grey mt-2">Нет заметок</p>
          </div>
        </div>
      </div>

      <!-- Статус -->
      <v-divider />
      <div class="notes-footer px-4 py-2 d-flex align-center justify-space-between">
        <span class="text-caption text-grey">
          {{ charCount }} символов · {{ lineCount }} строк
        </span>
        <v-btn
          v-if="isDirty"
          size="small"
          color="primary"
          variant="flat"
          @click="save"
        >
          Сохранить
        </v-btn>
        <span v-else class="text-caption text-grey">
          <v-icon icon="mdi-check" size="14" class="mr-1" />
          Сохранено
        </span>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed, watch, nextTick, inject } from 'vue'
import { renderMarkdown } from '../composables/useMarkdown'
import { findNodeById } from '../composables/useTreeTraversal'

const props = defineProps({
  nodeId: { type: String, default: null }
})

const emit = defineEmits(['close'])

const mindmap = inject('mindmap')

const mode = ref('split')
const draft = ref('')
const textareaRef = ref(null)
let saveTimer = null

// Находим узел
const node = computed(() => {
  if (!props.nodeId || !mindmap?.rootNode?.value) return null
  return findNodeById(mindmap.rootNode.value, props.nodeId)
})

// Загружаем заметку при открытии / смене узла
watch(() => props.nodeId, (newId) => {
  if (newId && node.value) {
    draft.value = node.value.notes || ''
  }
}, { immediate: true })

// Статистика
const charCount = computed(() => draft.value.length)
const lineCount = computed(() => draft.value ? draft.value.split('\n').length : 0)

// Изменения
const isDirty = computed(() => {
  if (!node.value) return false
  return draft.value !== (node.value.notes || '')
})

// Рендер markdown
const renderedHtml = computed(() => renderMarkdown(draft.value))

// Ввод с автосохранением (debounce 800ms)
function onInput(e) {
  draft.value = e.target.value
  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 800)
}

// Сохранение
function save() {
  if (!props.nodeId || !isDirty.value) return
  mindmap?.updateNotes(props.nodeId, draft.value)
}

// Закрытие — сохраняем перед закрытием
function onClose() {
  save()
  emit('close')
}

// --- Вставка форматирования ---
function getSelection() {
  const ta = textareaRef.value
  if (!ta) return { start: 0, end: 0, text: '' }
  return {
    start: ta.selectionStart,
    end: ta.selectionEnd,
    text: ta.value.substring(ta.selectionStart, ta.selectionEnd)
  }
}

function replaceSelection(before, after, newCursorOffset = null) {
  const ta = textareaRef.value
  if (!ta) return

  const sel = getSelection()
  const selectedText = sel.text || 'текст'

  const newText = draft.value.slice(0, sel.start)
    + before + selectedText + after
    + draft.value.slice(sel.end)

  draft.value = newText

  nextTick(() => {
    ta.focus()
    const pos = newCursorOffset ?? (sel.start + before.length + selectedText.length)
    ta.setSelectionRange(
      sel.start + before.length,
      sel.start + before.length + selectedText.length
    )
  })

  // Автосохранение
  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 800)
}

function insertFormat(before, after) {
  replaceSelection(before, after)
}

function insertLine(prefix) {
  const ta = textareaRef.value
  if (!ta) return

  const pos = ta.selectionStart
  const textBefore = draft.value.slice(0, pos)
  const lineStart = textBefore.lastIndexOf('\n') + 1

  draft.value = draft.value.slice(0, lineStart) + prefix + draft.value.slice(lineStart)

  nextTick(() => {
    ta.focus()
    const newPos = pos + prefix.length
    ta.setSelectionRange(newPos, newPos)
  })

  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 800)
}

function insertBlock(before, after) {
  replaceSelection(before, after)
}

function insertTab() {
  replaceSelection('  ', '')
}
</script>

<style scoped>
.notes-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 64px - 48px - 45px);
}

.notes-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.notes-editor--half {
  flex: 1;
  max-width: 50%;
}

.notes-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  gap: 2px;
}

.notes-textarea {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  padding: 12px 16px;
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  line-height: 1.6;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  overflow-y: auto;
}

.notes-textarea::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.3);
}

.notes-preview {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-width: 0;
}

.notes-preview--half {
  flex: 1;
  max-width: 50%;
}

.notes-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  opacity: 0.5;
}

.notes-footer {
  min-height: 45px;
}

/* Стили markdown-рендеринга */
.markdown-body {
  font-size: 14px;
  line-height: 1.7;
  word-wrap: break-word;
}

.markdown-body :deep(h1) { font-size: 1.5em; font-weight: 700; margin: 0.5em 0; border-bottom: 1px solid rgba(var(--v-border-color), 0.3); padding-bottom: 0.3em; }
.markdown-body :deep(h2) { font-size: 1.3em; font-weight: 600; margin: 0.5em 0; }
.markdown-body :deep(h3) { font-size: 1.1em; font-weight: 600; margin: 0.4em 0; }

.markdown-body :deep(p) { margin: 0.5em 0; }

.markdown-body :deep(ul),
.markdown-body :deep(ol) { padding-left: 1.5em; margin: 0.4em 0; }

.markdown-body :deep(li) { margin: 0.2em 0; }

.markdown-body :deep(blockquote) {
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  padding: 0.3em 1em;
  margin: 0.5em 0;
  background: rgba(var(--v-theme-primary), 0.05);
  border-radius: 0 4px 4px 0;
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

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}
</style>