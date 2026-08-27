<!-- embed/components/NotesToolbar.vue -->
<template>
  <div class="notes-toolbar">
    <!-- <div class="notes-toolbar__group">
      <v-tooltip v-for="btn in headingButtons" :key="btn.action" :text="btn.tooltip" location="bottom">
        <template #activator="{ props }">
          <v-btn v-bind="props" size="x-small" variant="text" @click="emit('action', btn.action)">
            <v-icon :icon="btn.icon" size="16" />
          </v-btn>
        </template>
      </v-tooltip>
    </div> -->

    <v-divider vertical class="mx-1" />

    <div class="notes-toolbar__group">
      <v-tooltip v-for="btn in formatButtons" :key="btn.action" :text="btn.tooltip" location="bottom">
        <template #activator="{ props }">
          <v-btn v-bind="props" size="x-small" variant="text" @click="emit('action', btn.action)">
            <v-icon :icon="btn.icon" size="16" />
          </v-btn>
        </template>
      </v-tooltip>
    </div>

    <v-divider vertical class="mx-1" />

    <div class="notes-toolbar__group">
      <v-tooltip v-for="btn in insertButtons" :key="btn.action" :text="btn.tooltip" location="bottom">
        <template #activator="{ props }">
          <v-btn v-bind="props" size="x-small" variant="text" @click="emit('action', btn.action)">
            <v-icon :icon="btn.icon" size="16" />
          </v-btn>
        </template>
      </v-tooltip>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['action'])

const headingButtons = [
  { action: 'h1', icon: 'mdi-format-header-1', tooltip: 'Заголовок 1' },
  { action: 'h2', icon: 'mdi-format-header-2', tooltip: 'Заголовок 2' },
  { action: 'h3', icon: 'mdi-format-header-3', tooltip: 'Заголовок 3' }
]

const formatButtons = [
  { action: 'bold', icon: 'mdi-format-bold', tooltip: 'Жирный' },
  { action: 'italic', icon: 'mdi-format-italic', tooltip: 'Курсив' },
  { action: 'code', icon: 'mdi-code-tags', tooltip: 'Код' },
  { action: 'codeblock', icon: 'mdi-code-braces', tooltip: 'Блок кода' }
]

const insertButtons = [
  { action: 'ul', icon: 'mdi-format-list-bulleted', tooltip: 'Список' },
  { action: 'ol', icon: 'mdi-format-list-numbered', tooltip: 'Нумерованный список' },
  { action: 'quote', icon: 'mdi-format-quote-close', tooltip: 'Цитата' },
  { action: 'link', icon: 'mdi-link', tooltip: 'Ссылка' },
  { action: 'image', icon: 'mdi-image', tooltip: 'Картинка' },
  { action: 'table', icon: 'mdi-table', tooltip: 'Таблица' },
  { action: 'hr', icon: 'mdi-minus', tooltip: 'Разделитель' }
]
</script>

<style scoped>
.notes-toolbar {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  gap: 2px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
  flex-wrap: wrap;
}

.notes-toolbar__group {
  display: flex;
  gap: 1px;
}
</style>
