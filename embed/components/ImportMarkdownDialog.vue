<!-- embed/components/ImportMarkdownDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="720"
    @update:model-value="onModelUpdate"
  >
    <v-card class="import-md-dialog">
      <v-card-title class="d-flex align-center ga-3">
        <v-icon icon="mdi-language-markdown" color="primary" />
        <span>Импорт Markdown</span>
      </v-card-title>

      <v-card-subtitle class="pb-2">
        Вставьте текст или загрузите <code>.md</code> файл.
        Первый заголовок заменит текст текущего узла;
        остальные станут его потомками.
      </v-card-subtitle>

      <v-card-text>
        <!-- Upload + clear -->
        <div class="d-flex ga-2 mb-3">
          <v-btn
            variant="tonal"
            size="small"
            prepend-icon="mdi-file-upload-outline"
            @click="triggerFileInput"
          >
            Загрузить файл
          </v-btn>
          <v-btn
            v-if="markdown"
            variant="text"
            size="small"
            prepend-icon="mdi-close"
            @click="markdown = ''"
          >
            Очистить
          </v-btn>
          <input
            ref="fileInput"
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            hidden
            @change="onFileSelected"
          />
        </div>

        <!-- Textarea -->
        <v-textarea
          v-model="markdown"
          :placeholder="PLACEHOLDER"
          variant="outlined"
          rows="14"
          max-rows="20"
          auto-grow
          hide-details
          class="import-md-dialog__textarea"
          spellcheck="false"
        />

        <!-- Live-stats -->
        <div class="import-md-dialog__stats">
          <template v-if="stats">
            <v-icon
              :icon="stats.ok ? 'mdi-check-circle' : 'mdi-alert-circle'"
              :color="stats.ok ? 'success' : 'warning'"
              size="18"
            />
            <span>{{ stats.message }}</span>
          </template>
          <template v-else>
            <v-icon icon="mdi-information-outline" size="18" color="grey" />
            <span class="text-grey">Поле пустое</span>
          </template>
        </div>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="onCancel">Отмена</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!canImport"
          prepend-icon="mdi-check"
          @click="onConfirm"
        >
          Импортировать
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [markdown: string]
}>()

const PLACEHOLDER = `# Пример корневого узла
Можно добавить описание — оно пойдёт в notes.

## Первый потомок
### Внук

## Второй потомок`

const markdown = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

// ─── Сброс при открытии ──────────────────────────

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) markdown.value = ''
  }
)

// ─── Лёгкий анализ без импорта парсера ───────────
//
// Считаем заголовки через regexp — быстро и без
// необходимости парсить всё дерево для каждой клавиши.

const stats = computed<{ ok: boolean; message: string } | null>(() => {
  const text = markdown.value.trim()
  if (!text) return null

  const headings = text.match(/^#{1,6}\s+.+$/gm) ?? []

  if (headings.length === 0) {
    return {
      ok: false,
      message: 'Не найдено заголовков (# Название). Импорт невозможен.'
    }
  }

  if (headings.length === 1) {
    return {
      ok: true,
      message: 'Найден 1 заголовок — узел будет переименован без добавления потомков.'
    }
  }

  return {
    ok: true,
    message: `Найдено секций: ${headings.length} — узел будет переименован, остальные станут потомками.`
  }
})

const canImport = computed(() => stats.value?.ok === true)

// ─── Handlers ────────────────────────────────────

function onModelUpdate(v: boolean) {
  emit('update:modelValue', v)
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return

  try {
    const text = await file.text()
    markdown.value = text
  } catch (err) {
    console.warn('[import-md] Ошибка чтения файла:', err)
  }
}

function onCancel() {
  emit('update:modelValue', false)
}

function onConfirm() {
  if (!canImport.value) return
  emit('confirm', markdown.value)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.import-md-dialog {
  border-radius: 16px;
}

.import-md-dialog__textarea :deep(textarea) {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 13px;
  line-height: 1.5;
  tab-size: 2;
}

.import-md-dialog__stats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-radius: 8px;
  font-size: 13px;
}

code {
  padding: 1px 6px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85em;
}
</style>
