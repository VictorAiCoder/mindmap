<!-- src/components/NodeItem.vue -->
<template>
  <div class="mind-node" :class="{ 'is-dragging': isDragging, 'is-root': isRoot }">
    <div
      class="node-content"
      :draggable="!isRoot"
      @dragstart.stop="onDragStart"
      @dragend.stop="onDragEnd"
      @dragover.prevent.stop="isDragOver = true"
      @dragleave.stop="isDragOver = false"
      @drop.prevent.stop="onDrop"
    >
      <v-card
        :variant="isDragOver ? 'tonal' : 'outlined'"
        :color="isDragOver ? 'primary' : undefined"
        class="node-card"
        :class="{ 'drag-highlight': isDragOver }"
        :style="{ borderLeftColor: node.color, borderLeftWidth: '4px' }"
        density="compact"
      >
        <div class="d-flex align-center pa-2">
          <!-- Сворачивание -->
          <v-btn
            v-if="hasChildren"
            :icon="node.collapsed ? 'mdi-chevron-right' : 'mdi-chevron-down'"
            size="x-small"
            variant="text"
            density="compact"
            @click.stop="mindmap.toggleCollapse(node.id)"
            class="mr-1 flex-shrink-0"
          />
          <div v-else class="mr-1" style="width: 28px" />

          <!-- Drag handle -->
          <v-icon
            v-if="!isRoot"
            icon="mdi-drag-vertical"
            size="small"
            class="drag-handle mr-1"
            color="grey"
          />

          <!-- Цвет -->
          <v-menu :close-on-content-click="false" location="bottom">
            <template #activator="{ props: menuProps }">
              <div
                v-bind="menuProps"
                class="color-dot mr-2"
                :style="{ backgroundColor: node.color }"
                @click.stop
              />
            </template>
            <v-card class="pa-2" width="200">
              <v-color-picker
                :model-value="node.color"
                @update:model-value="(c) => mindmap.updateColor(node.id, c)"
                hide-inputs
                hide-canvas
                show-swatches
                swatches-max-height="120"
              />
            </v-card>
          </v-menu>

          <!-- Текст / Редактирование -->
          <div
            v-if="!isEditing"
            class="node-text flex-grow-1"
            @dblclick.stop="startEdit"
          >
            {{ node.text }}
          </div>
          <v-text-field
            v-else
            v-model="editText"
            density="compact"
            variant="underlined"
            hide-details
            single-line
            autofocus
            class="flex-grow-1 node-edit-field"
            @keydown.enter.stop="finishEdit"
            @keydown.esc.stop="cancelEdit"
            @blur="finishEdit"
            @click.stop
          />

          <!-- Кнопки действий -->
          <div class="node-actions d-flex ml-1">
            <v-tooltip text="Добавить дочерний" location="top">
              <template #activator="{ props: tip }">
                <v-btn
                  v-bind="tip"
                  icon="mdi-plus"
                  size="x-small"
                  variant="text"
                  color="success"
                  density="compact"
                  @click.stop="mindmap.addChild(node.id)"
                />
              </template>
            </v-tooltip>

            <v-tooltip text="Редактировать" location="top">
              <template #activator="{ props: tip }">
                <v-btn
                  v-bind="tip"
                  icon="mdi-pencil"
                  size="x-small"
                  variant="text"
                  color="primary"
                  density="compact"
                  @click.stop="startEdit"
                />
              </template>
            </v-tooltip>

            <v-tooltip v-if="!isRoot" text="Удалить" location="top">
              <template #activator="{ props: tip }">
                <v-btn
                  v-bind="tip"
                  icon="mdi-delete-outline"
                  size="x-small"
                  variant="text"
                  color="error"
                  density="compact"
                  @click.stop="deleteDialog = true"
                />
              </template>
            </v-tooltip>
          </div>

          <!-- Счётчик при свёрнутом состоянии -->
          <v-chip
            v-if="node.collapsed && hasChildren"
            size="x-small"
            color="grey"
            variant="tonal"
            class="ml-1"
          >
            {{ node.children.length }}
          </v-chip>
        </div>
      </v-card>
    </div>

    <!-- Дочерние узлы (рекурсия) — без пробросов событий -->
    <v-expand-transition>
      <div v-show="!node.collapsed && hasChildren" class="node-children">
        <NodeItem
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :depth="depth + 1"
        />
      </div>
    </v-expand-transition>

    <!-- Диалог подтверждения удаления -->
    <v-dialog v-model="deleteDialog" max-width="350">
      <v-card>
        <v-card-title class="text-body-1">
          <v-icon icon="mdi-alert" color="warning" class="mr-2" />
          Удалить узел?
        </v-card-title>
        <v-card-text>
          «{{ node.text }}» и все его дочерние узлы будут удалены.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Отмена</v-btn>
          <v-btn
            color="error"
            variant="flat"
            @click="doDelete"
          >
            Удалить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, inject, nextTick } from 'vue'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 }
})

// Inject — получаем API с любой глубины без пробросов
const mindmap = inject('mindmap')
const notify = inject('notify')

const isRoot = computed(() => props.depth === 0)
const hasChildren = computed(() => props.node.children?.length > 0)

// --- Редактирование ---
const isEditing = ref(false)
const editText = ref('')

function startEdit() {
  editText.value = props.node.text
  isEditing.value = true
}

function finishEdit() {
  if (!isEditing.value) return
  const trimmed = editText.value.trim()
  if (trimmed && trimmed !== props.node.text) {
    mindmap.updateText(props.node.id, trimmed)
  }
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
}

// --- Удаление ---
const deleteDialog = ref(false)

function doDelete() {
  deleteDialog.value = false
  mindmap.deleteNode(props.node.id)
  notify(`Узел «${props.node.text}» удалён`, 'error', 'mdi-delete')
}

// --- Drag & Drop ---
const isDragOver = ref(false)
const isDragging = ref(false)

function onDragStart(e) {
  if (isRoot.value) {
    e.preventDefault()
    return
  }
  isDragging.value = true
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', props.node.id)
  mindmap.drag.start(props.node.id)
}

function onDragEnd() {
  isDragging.value = false
  mindmap.drag.end()
}

function onDrop() {
  isDragOver.value = false
  mindmap.drag.dropOn(props.node.id)
}
</script>

<style scoped>
.mind-node {
  margin-bottom: 2px;
}

.node-card {
  transition: all 0.2s ease;
  border-radius: 8px !important;
}

.node-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
}

.drag-highlight {
  border: 2px dashed rgb(var(--v-theme-primary)) !important;
  background: rgba(var(--v-theme-primary), 0.08) !important;
}

.is-dragging .node-card {
  opacity: 0.5;
  transform: scale(0.98);
}

.drag-handle {
  cursor: grab;
  opacity: 0.4;
  transition: opacity 0.2s;
}

.drag-handle:hover {
  opacity: 1;
}

.node-content:active .drag-handle {
  cursor: grabbing;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.color-dot:hover {
  transform: scale(1.3);
}

.node-text {
  font-size: 0.9rem;
  cursor: text;
  padding: 2px 4px;
  border-radius: 4px;
  min-width: 40px;
  word-break: break-word;
}

.node-text:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.is-root > .node-content .node-text {
  font-weight: 600;
  font-size: 1.05rem;
}

.node-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.node-card:hover .node-actions {
  opacity: 1;
}

.node-children {
  padding-left: 28px;
  border-left: 2px solid rgba(0, 0, 0, 0.06);
  margin-left: 16px;
}

.node-edit-field {
  font-size: 0.9rem;
}

.node-edit-field :deep(.v-field__input) {
  padding: 2px 4px;
  min-height: unset;
  font-size: 0.9rem;
}
</style>