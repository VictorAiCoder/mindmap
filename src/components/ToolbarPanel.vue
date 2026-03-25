<!-- src/components/ToolbarPanel.vue -->
<template>
  <v-app-bar elevation="2" color="primary" density="comfortable">
    <v-app-bar-title class="d-flex align-center">
      <v-icon icon="mdi-brain" class="mr-2" />
      <span class="font-weight-bold">MindMap</span>
      <v-chip size="small" class="ml-3" variant="tonal" color="white">
        {{ nodeCount }} узлов · глубина {{ depth }}
      </v-chip>
    </v-app-bar-title>

    <template #append>
      <!-- Undo / Redo -->
      <v-tooltip text="Отменить (Ctrl+Z)" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-undo"
            variant="text"
            :disabled="!canUndo"
            @click="emit('undo')"
          />
        </template>
      </v-tooltip>

      <v-tooltip text="Повторить (Ctrl+Y)" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-redo"
            variant="text"
            :disabled="!canRedo"
            @click="emit('redo')"
          />
        </template>
      </v-tooltip>

      <v-divider vertical class="mx-1" />

      <!-- Экспорт / Импорт -->
      <v-tooltip text="Экспорт в JSON" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-download"
            variant="text"
            @click="emit('export')"
          />
        </template>
      </v-tooltip>

      <v-tooltip text="Импорт из JSON" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-upload"
            variant="text"
            @click="fileInput?.click()"
          />
        </template>
      </v-tooltip>

      <v-divider vertical class="mx-1" />

      <!-- Сброс -->
      <v-tooltip text="Сбросить карту" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-refresh"
            variant="text"
            @click="resetDialog = true"
          />
        </template>
      </v-tooltip>

      <!-- Тема -->
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
    </template>

    <!-- Скрытый input для файлов -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      hidden
      @change="onFileSelected"
    />
  </v-app-bar>

  <!-- Диалог подтверждения сброса -->
  <v-dialog v-model="resetDialog" max-width="400">
    <v-card>
      <v-card-title class="text-h6">
        <v-icon icon="mdi-alert" color="warning" class="mr-2" />
        Сбросить карту?
      </v-card-title>
      <v-card-text>
        Все текущие данные будут удалены и заменены картой по умолчанию.
        Это действие нельзя отменить.
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="resetDialog = false">
          Отмена
        </v-btn>
        <v-btn color="error" variant="flat" @click="doReset">
          Сбросить
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  nodeCount: { type: Number, default: 0 },
  depth: { type: Number, default: 0 },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
  isDark: { type: Boolean, default: false }
})

const emit = defineEmits(['export', 'import', 'reset', 'undo', 'redo', 'toggleTheme'])

const fileInput = ref(null)
const resetDialog = ref(false)

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (file) {
    emit('import', file)
    e.target.value = ''
  }
}

function doReset() {
  resetDialog.value = false
  emit('reset')
}
</script>