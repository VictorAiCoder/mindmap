<!-- src/components/panels/segment-editor/SegmentEditorPanel.vue -->
<template>
  <v-dialog
    :model-value="open"
    max-width="900"
    persistent
    @update:model-value="(v) => !v && handleClose()"
    @keydown.esc="handleEsc"
    @keydown.delete="handleDelete"
  >
    <v-card v-if="open && resolved">
      <v-card-title class="d-flex align-center">
        <span>Редактирование сегментов</span>
        <v-spacer />
        <v-btn icon variant="text" @click="handleClose">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-subtitle class="text-caption">
        Нажмите и тяните по картинке, чтобы создать сегмент.
        Esc — отменить, Delete — удалить выбранный.
      </v-card-subtitle>

      <v-card-text class="seg-panel__body">
        <SegmentCanvas
          :image-src="resolved.dataUrl"
          :segments="editor.segments.value"
          :selected-id="editor.selectedId.value"
          :draft-rect="editor.draftRect.value"
          @begin-create="editor.beginCreate"
          @begin-move="editor.beginMove"
          @begin-resize="editor.beginResize"
          @pointer-move="editor.onPointerMove"
          @pointer-up="editor.onPointerUp"
          @select="editor.select"
        />

        <div class="seg-panel__sidebar">
          <div class="text-subtitle-2 mb-2">
            Сегменты ({{ editor.segments.value.length }})
          </div>

          <div v-if="editor.segments.value.length === 0" class="text-caption text-medium-emphasis">
            Нет сегментов. Выделите область на картинке.
          </div>

          <v-list density="compact" nav>
            <v-list-item
              v-for="seg in editor.segments.value"
              :key="seg.id"
              :active="editor.selectedId.value === seg.id"
              @click="editor.select(seg.id)"
            >
              <v-list-item-title class="text-body-2">
                {{ seg.name || 'Без имени' }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ formatClip(seg.clip) }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider class="my-3" />

          <div v-if="editor.selectedSegment.value">
            <v-text-field
              v-model="renameDraft"
              label="Имя сегмента"
              density="compact"
              variant="outlined"
              hide-details
              @blur="commitRename"
              @keydown.enter="commitRename"
            />

            <v-btn
              class="mt-3"
              color="error"
              variant="tonal"
              block
              prepend-icon="mdi-delete"
              @click="editor.deleteSelected"
            >
              Удалить сегмент
            </v-btn>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="handleClose">Готово</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSegmentEditor } from '@/composables/image/useSegmentEditor'
import type { MindMapApi } from '@/types/mindmap-api'
import type { ImageSegment } from '@entities/image'
import SegmentCanvas from './SegmentCanvas.vue'

const props = defineProps<{
  open: boolean
  /** id источника (raw image) */
  sourceId: string | null
  mindmap: MindMapApi
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// sourceId как Ref для useSegmentEditor
const sourceIdRef = computed(() => props.sourceId)

const editor = useSegmentEditor({
  mindmap: props.mindmap,
  sourceId: sourceIdRef,
})

const resolved = computed(() => {
  if (!props.sourceId) return null
  return props.mindmap.imageStorage.resolve(props.sourceId)
})

// Имя сегмента — локальный draft, чтобы не дёргать историю на каждый keystroke
const renameDraft = ref('')

watch(
  () => editor.selectedSegment.value?.id,
  () => {
    renameDraft.value = editor.selectedSegment.value?.name ?? ''
  }
)

function commitRename(): void {
  editor.renameSelected(renameDraft.value)
}

function formatClip(clip: ImageSegment['clip']): string {
  const pct = (n: number) => Math.round(n * 100)
  return `${pct(clip.w)}×${pct(clip.h)}% @ ${pct(clip.x)},${pct(clip.y)}`
}

function handleClose(): void {
  editor.reset()
  emit('close')
}

function handleEsc(e: KeyboardEvent): void {
  // Если идёт drag — отмена операции, иначе закрытие
  if (editor.interaction.value.kind !== 'idle') {
    e.stopPropagation()
    editor.cancelInteraction()
  } else {
    handleClose()
  }
}

function handleDelete(e: KeyboardEvent): void {
  if (editor.selectedId.value && editor.interaction.value.kind === 'idle') {
    e.stopPropagation()
    editor.deleteSelected()
  }
}

// Сброс при закрытии извне
watch(() => props.open, (v) => {
  if (!v) editor.reset()
})
</script>

<style scoped>
.seg-panel__body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 16px;
  align-items: start;
}

.seg-panel__sidebar {
  min-width: 0;
}
</style>