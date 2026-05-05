<!-- src/components/panels/ImageGalleryCard.vue -->
<template>
  <div class="gallery-card-wrap">
    <!-- ─── Карточка-обводка (только превью) ─── -->
    <v-card
      class="gallery-card"
      :class="{ 'is-unused': usageCount === 0 }"
      variant="outlined"
      draggable="true"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
      @mousedown="onMouseDown"
      @pointerdown.stop
      @click.stop
    >
      <div class="card-preview">
        <ImagePreview
          :image-id="image.id"
          :alt="image.name ?? ''"
          fit="contain"
        />

        <!-- Бейдж "сегмент" (левый верх) -->
        <div v-if="image.kind === 'segment'" class="badge-segment">
          <v-icon icon="mdi-crop" size="12" />
        </div>

        <!-- Бейдж использования (левый низ) -->
        <v-chip
          size="x-small"
          :color="usageCount > 0 ? 'success' : 'warning'"
          variant="flat"
          class="badge-usage"
        >
          {{ usageCount > 0 ? `×${usageCount}` : 'не исп.' }}
        </v-chip>

        <!-- Кнопки действий (правый верх, на hover) -->
        <div class="card-actions">
          <v-btn
            icon="mdi-target"
            variant="flat"
            size="x-small"
            :disabled="usageCount === 0"
            @click.stop="emit('highlight')"
            @mousedown.stop
          >
            <v-icon icon="mdi-target" size="14" />
            <v-tooltip activator="parent" location="bottom">
              Показать использование
            </v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-delete"
            variant="flat"
            size="x-small"
            color="error"
            @click.stop="emit('delete')"
            @mousedown.stop
          >
            <v-icon icon="mdi-delete" size="14" />
            <v-tooltip activator="parent" location="bottom">Удалить</v-tooltip>
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- ─── Подпись под карточкой ─── -->
    <div class="card-caption">
      <div v-if="!editing" class="caption-name-wrap">
        <div
          class="caption-name text-caption text-truncate"
          :title="image.name ?? 'Без имени'"
          @dblclick.stop="startEdit"
        >
          {{ image.name || 'Без имени' }}
        </div>
        <v-btn
          icon="mdi-pencil"
          variant="text"
          size="x-small"
          density="compact"
          class="caption-edit-btn"
          @click.stop="startEdit"
          @mousedown.stop
        />
      </div>

      <v-text-field
        v-else
        ref="editRef"
        v-model="editBuffer"
        density="compact"
        variant="plain"
        hide-details
        autofocus
        class="caption-edit-field"
        @keydown.enter="finishEdit"
        @keydown.esc="cancelEdit"
        @blur="finishEdit"
        @click.stop
        @mousedown.stop
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'
import type { StoredImage } from '@entities/image'
import ImagePreview from './ImagePreview.vue'

const props = defineProps<{
  image: StoredImage
  usageCount: number
}>()

const emit = defineEmits<{
  rename: [newName: string]
  delete: []
  highlight: []
  dropped: []
}>()

// ─── Редактирование имени ───────────────────
const editing = ref(false)
const editBuffer = ref('')
const editRef = ref<{ focus: () => void } | null>(null)

function startEdit() {
  editBuffer.value = props.image.name ?? ''
  editing.value = true
  nextTick(() => editRef.value?.focus())
}

function finishEdit() {
  if (!editing.value) return
  editing.value = false
  const trimmed = editBuffer.value.trim()
  if (trimmed && trimmed !== props.image.name) {
    emit('rename', trimmed)
  }
}

function cancelEdit() {
  editing.value = false
}

function onMouseDown(e: MouseEvent) {
  e.stopPropagation()
}

// ─── Drag ───────────────────────────────────
function onDragStart(e: DragEvent) {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('application/x-mindmap-image-id', props.image.id)
  e.dataTransfer.setData('text/plain', props.image.name ?? props.image.id)
  document.body.classList.add('mindmap-dragging-image')
}

function onDragEnd(e: DragEvent) {
  document.body.classList.remove('mindmap-dragging-image')
  if (e.dataTransfer?.dropEffect === 'copy') {
    emit('dropped')
  }
}

onUnmounted(() => {
  document.body.classList.remove('mindmap-dragging-image')
})
</script>

<style scoped>
/* ─── Обёртка: карточка + подпись ─── */
.gallery-card-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;     /* для text-truncate в подписи */
}

/* ─── Карточка с обводкой (только превью) ─── */
.gallery-card {
  cursor: grab;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.1s;
}
.gallery-card:active {
  cursor: grabbing;
  transform: scale(0.98);
}
.gallery-card:hover {
  border-color: rgb(var(--v-theme-primary));
}
.gallery-card.is-unused {
  border-color: rgba(var(--v-theme-warning), 0.4);
}

/* ─── Превью: квадрат во всю ширину ─── */
.card-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  /* Шахматный фон, чтобы было видно прозрачные поля при fit=contain */
  background-color: rgb(var(--v-theme-surface));
  background-image:
    linear-gradient(45deg, rgba(0,0,0,0.04) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(0,0,0,0.04) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.04) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.04) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}

/* ─── Бейдж "Сегмент" (левый верх) ─── */
.badge-segment {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  z-index: 2;
}

/* ─── Бейдж использования (левый низ) ─── */
.badge-usage {
  position: absolute;
  bottom: 6px;
  left: 6px;
  pointer-events: none;
  z-index: 2;
}

/* ─── Кнопки действий (правый верх, на hover) ─── */
.card-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 2;
}
.gallery-card:hover .card-actions {
  opacity: 1;
}
@media (hover: none) {
  .card-actions {
    opacity: 1;
  }
}

.card-actions :deep(.v-btn) {
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  background: rgba(var(--v-theme-surface), 0.85) !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

/* ─── Подпись под карточкой ─── */
.card-caption {
  padding: 0 2px;
  min-height: 20px;
  display: flex;
  align-items: center;
}

.caption-name-wrap {
  display: flex;
  align-items: center;
  gap: 2px;
  width: 100%;
  min-width: 0;
}

.caption-name {
  flex: 1;
  min-width: 0;
  font-weight: 500;
  cursor: text;
  line-height: 1.3;
}

.caption-edit-btn {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}
.gallery-card-wrap:hover .caption-edit-btn {
  opacity: 0.7;
}
.caption-edit-btn:hover {
  opacity: 1 !important;
}

.caption-edit-field :deep(.v-field__input) {
  padding: 0;
  min-height: 22px;
  font-size: 0.75rem;
}
</style>