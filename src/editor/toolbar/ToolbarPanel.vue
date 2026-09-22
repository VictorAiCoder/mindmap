<!-- src/editor/toolbar/ToolbarPanel.vue -->
<template>
  <v-app-bar elevation="2" color="primary" density="comfortable">
    <v-app-bar-title class="d-flex align-center">
      <v-icon icon="mdi-brain" class="mr-2" />
      <span class="font-weight-bold">MindMap</span>
      
      <v-divider vertical class="mx-1" />
      <!-- Gallery -->
      <v-tooltip text="Галерея картинок" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
            :active="galleryOpen"
            @click="emit('toggleGallery')"
          >
            <v-badge
              :content="imagesTotal"
              :model-value="imagesTotal > 0"
              :color="imagesUnused > 0 ? 'warning' : 'grey-lighten-1'"
              offset-x="-4"
              offset-y="-4"
            >
              <v-icon icon="mdi-image-multiple" />
            </v-badge>
          </v-btn>
        </template>
      </v-tooltip>

      <v-chip size="small" class="ml-3" variant="tonal" color="white">
        {{ nodeCount }} узлов · глубина {{ depth }}
      </v-chip>
    </v-app-bar-title>

    <template #append>
      
      <v-tooltip text="Сбросить карту" location="bottom">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-refresh" variant="text" @click="resetDialog = true" />
        </template>
      </v-tooltip>

      <v-divider vertical class="mx-1" />

      <!-- Import -->
      <v-menu>
        <template #activator="{ props: menu }">
          <v-tooltip text="Импорт" location="bottom">
            <template #activator="{ props: tip }">
              <v-btn v-bind="{ ...menu, ...tip }" icon="mdi-upload" variant="text" />
            </template>
          </v-tooltip>
        </template>
        <v-list density="compact" min-width="220">
          <v-list-subheader>Импорт карты</v-list-subheader>
          <v-list-item prepend-icon="mdi-code-json" title="Из JSON" @click="openFilePicker('.json')" />
          <v-list-item prepend-icon="mdi-language-markdown" title="Из Markdown" @click="openFilePicker('.md,.markdown')" />
          <v-list-item prepend-icon="mdi-file-question" title="Авто-определение" @click="openFilePicker('.json,.md,.markdown,.txt')" />
        </v-list>
      </v-menu>

      <!-- Export -->
      <v-menu>
        <template #activator="{ props: menu }">
          <v-tooltip text="Экспорт" location="bottom">
            <template #activator="{ props: tip }">
              <v-btn v-bind="{ ...menu, ...tip }" icon="mdi-download" variant="text" />
            </template>
          </v-tooltip>
        </template>
        <v-list density="compact" min-width="220">
          <v-list-subheader>Экспорт карты</v-list-subheader>
          <v-list-item
            prepend-icon="mdi-code-json"
            title="JSON"
            subtitle="Полные данные карты"
            @click="emit('export', 'json')"
          />
          <v-list-item
            prepend-icon="mdi-language-markdown"
            title="Markdown"
            subtitle="Текстовый формат"
            @click="emit('export', 'md')"
          />
        </v-list>
      </v-menu>

      <v-divider vertical class="mx-1" />

      <!-- Layout -->
      <v-menu>
        <template #activator="{ props: menu }">
          <v-tooltip text="Раскладка узлов" location="bottom">
            <template #activator="{ props: tip }">
              <v-btn v-bind="{ ...menu, ...tip }" icon="mdi-auto-fix" variant="text" />
            </template>
          </v-tooltip>
        </template>
        <v-list density="compact" min-width="240">
          <v-list-subheader>Авто-раскладка</v-list-subheader>
          <v-list-item
            v-for="(layout, key) in layoutTypes"
            :key="key"
            :prepend-icon="layout.icon"
            :title="layout.label"
            @click="emit('autoLayout', key as LayoutType)"
          />
          <v-divider class="my-1" />
          <v-list-item
            prepend-icon="mdi-pin-off-outline"
            title="Сбросить позиции"
            subtitle="Вернуть авто-расчёт"
            @click="emit('resetLayout')"
          />
        </v-list>
      </v-menu>

      <v-tooltip :text="isEmbed ? 'Режим редактирования' : 'Режим просмотра'" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            :icon="isEmbed ? 'mdi-pencil' : 'mdi-eye'"
            variant="text"
            @click="emit('toggleEmbed')"
          />
        </template>
      </v-tooltip>

      <v-divider vertical class="mx-1" />

      <v-tooltip text="Переключить тему" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            variant="text"
            @click="emit('toggleTheme')"
          />
        </template>
      </v-tooltip>

      <v-divider vertical class="mx-1" />

      <v-tooltip text="Отменить (Ctrl+Z)" location="bottom">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-undo" variant="text" :disabled="!canUndo" @click="emit('undo')" />
        </template>
      </v-tooltip>

      <v-tooltip text="Повторить (Ctrl+Y)" location="bottom">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon="mdi-redo" variant="text" :disabled="!canRedo" @click="emit('redo')" />
        </template>
      </v-tooltip>

      <div class="mx-4" />
     
    </template>

    <input
      ref="fileInput"
      type="file"
      :accept="fileAccept"
      hidden
      @change="onFileSelected"
    />
  </v-app-bar>

  <v-dialog v-model="resetDialog" max-width="400">
    <v-card>
      <v-card-title class="text-h6">
        <v-icon icon="mdi-alert" color="warning" class="mr-2" />
        Сбросить карту?
      </v-card-title>
      <v-card-text>Все данные будут удалены и заменены картой по умолчанию.</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="resetDialog = false">Отмена</v-btn>
        <v-btn color="error" variant="flat" @click="resetDialog = false; emit('reset')">
          Сбросить
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { LAYOUT_TYPES } from '@features/layout'
import type { LayoutType, ExportFormat } from '../../embed/types/mindmap-api'

interface Props {
  nodeCount?: number
  depth?: number
  canUndo?: boolean
  canRedo?: boolean
  isDark?: boolean
  isEmbed?: boolean
  imagesTotal?: number
  imagesUnused?: number
  galleryOpen?: boolean
}

withDefaults(defineProps<Props>(), {
  nodeCount: 0,
  depth: 0,
  canUndo: false,
  canRedo: false,
  isDark: false,
  isEmbed: false,
  imagesTotal: 0,
  imagesUnused: 0,
  galleryOpen: false
})

const emit = defineEmits<{
  export: [format: ExportFormat]
  import: [file: File]
  reset: []
  undo: []
  redo: []
  toggleTheme: []
  autoLayout: [type: LayoutType]
  resetLayout: []
  toggleGallery: []
  toggleEmbed: []
}>()

const layoutTypes = LAYOUT_TYPES
const fileInput = ref<HTMLInputElement | null>(null)
const fileAccept = ref<string>('.json,.md,.markdown')
const resetDialog = ref<boolean>(false)

function openFilePicker(accept: string): void {
  fileAccept.value = accept
  nextTick(() => fileInput.value?.click())
}

function onFileSelected(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('import', file)
    input.value = ''
  }
}
</script>
