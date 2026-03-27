<!-- src/components/MapNode.vue -->
<template>
  <div
    class="map-node"
    :class="{
      'map-node--root': isRoot,
      'map-node--leaf': isLeaf,
      'map-node--has-image': hasImage,
      'map-node--drag-over': isDraggedOver,
      'map-node--dragging': isBeingDragged,
      'map-node--custom': pos.hasCustomPos,
      'map-node--image-drop': isImageDragOver
    }"
    :style="nodeStyle"
    @dblclick.stop="$emit('edit')"
    @mousedown.stop="onMouseDown"
    @dragover.prevent.stop="onImageDragOver"
    @dragleave.stop="isImageDragOver = false"
    @drop.prevent.stop="onImageDrop"
  >
    <!-- Картинка НАД узлом -->
    <div v-if="hasImage" class="map-node__image-float">
      <img
        :src="pos.node.image"
        class="map-node__image"
        alt=""
        draggable="false"
        referrerpolicy="no-referrer"
        @error="onImageError"
      />
      <button
        class="map-node__image-remove"
        @click.stop="$emit('removeImage')"
        @mousedown.stop
      >
        <v-icon icon="mdi-close" size="12" />
      </button>
    </div>

    <!-- Фон -->
    <div class="map-node__bg" :style="bgStyle" />

    <!-- Контент -->
    <div class="map-node__content">
      <button
        v-if="hasChildren"
        class="map-node__toggle"
        @click.stop="$emit('toggle')"
        @mousedown.stop
      >
        <v-icon
          :icon="pos.node.collapsed ? 'mdi-chevron-right' : 'mdi-chevron-down'"
          size="16"
        />
      </button>

      <span class="map-node__text">{{ pos.node.text }}</span>

      <v-icon
        v-if="hasNotes"
        icon="mdi-text-box-outline"
        size="12"
        class="map-node__notes-icon"
        :color="isRoot ? 'white' : pos.node.color"
      />

      <span v-if="pos.node.collapsed && hasChildren" class="map-node__badge">
        {{ pos.node.children.length }}
      </span>

      <v-icon
        v-if="pos.hasCustomPos"
        icon="mdi-pin" size="10"
        class="map-node__pin" color="grey"
      />
    </div>

    <!-- ★ Превью заметки ПОД узлом — рендерит markdown -->
    <div
      v-if="hasNotes"
      class="map-node__notes-preview"
      :class="{ 'map-node__notes-preview--expanded': isNotesHovered }"
      :style="notesPreviewStyle"
      @click.stop="$emit('openNotes')"
      @mousedown.stop
      @mouseenter="isNotesHovered = true"
      @mouseleave="isNotesHovered = false"
    >
      <!-- Превью: 7 строк, рендер markdown -->
      <div
        v-if="!isNotesHovered"
        class="map-node__notes-md markdown-mini"
        v-html="previewHtml"
      />

      <!-- Полная версия при наведении -->
      <div
        v-else
        class="map-node__notes-md map-node__notes-md--full markdown-mini"
        v-html="fullHtml"
      />

      <!-- Индикатор что есть ещё текст -->
      <div v-if="hasMoreContent && !isNotesHovered" class="map-node__notes-fade">
        <span class="map-node__notes-more">наведите чтобы развернуть…</span>
      </div>
    </div>

    <!-- Кнопки -->
    <div class="map-node__actions" @mousedown.stop>
      <button
        v-if="!hasImage"
        class="map-node__action map-node__action--image"
        @click.stop="triggerImageUpload"
      >
        <v-icon icon="mdi-image-plus" size="14" />
      </button>
      <button
        class="map-node__action map-node__action--notes"
        @click.stop="$emit('openNotes')"
      >
        <v-icon :icon="hasNotes ? 'mdi-text-box-edit-outline' : 'mdi-text-box-plus-outline'" size="14" />
      </button>
      <button class="map-node__action map-node__action--add" @click.stop="$emit('addChild')">
        <v-icon icon="mdi-plus" size="14" />
      </button>
      <button class="map-node__action map-node__action--edit" @click.stop="$emit('edit')">
        <v-icon icon="mdi-pencil" size="14" />
      </button>
      <button
        v-if="pos.hasCustomPos"
        class="map-node__action map-node__action--reset"
        @click.stop="$emit('resetPosition')"
      >
        <v-icon icon="mdi-pin-off" size="14" />
      </button>
      <button
        v-if="!isRoot"
        class="map-node__action map-node__action--delete"
        @click.stop="$emit('delete')"
      >
        <v-icon icon="mdi-delete" size="14" />
      </button>
    </div>

    <input ref="imageInput" type="file" accept="image/*" hidden @change="onImageSelected" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { processImageFile, getImageFromDrop } from '../composables/useImageHandler'
import { getNotesPreview, renderMarkdown } from '../composables/useMarkdown'

const props = defineProps({
  pos: { type: Object, required: true },
  isDraggedOver: { type: Boolean, default: false },
  isBeingDragged: { type: Boolean, default: false },
  liveX: { type: Number, default: null },
  liveY: { type: Number, default: null }
})

const emit = defineEmits([
  'edit', 'addChild', 'delete', 'toggle',
  'resetPosition', 'startDrag',
  'setImage', 'removeImage',
  'openNotes'
])

const imageInput = ref(null)
const isImageDragOver = ref(false)
const isNotesHovered = ref(false)

const isRoot = computed(() => props.pos.depth === 0)
const isLeaf = computed(() => props.pos.depth >= 2)
const hasChildren = computed(() => props.pos.node.children?.length > 0)
// const hasImage = computed(() => !!props.pos.node.image)
const hasImage = computed(() => {
  const img = props.pos.node.image
  return !!img && typeof img === 'string' && img.trim().length > 0
})
const hasNotes = computed(() => !!props.pos.node.notes?.trim())

// ★ Превью — первые 7 строк, рендерим как markdown
const previewText = computed(() => getNotesPreview(props.pos.node.notes, 7, 400))
const previewHtml = computed(() => renderMarkdown(previewText.value))
const fullHtml = computed(() => renderMarkdown(props.pos.node.notes))

// Есть ли ещё контент за пределами превью
const hasMoreContent = computed(() => {
  const notes = props.pos.node.notes || ''
  return notes.split('\n').length > 7 || notes.length > 400
})

const notesPreviewStyle = computed(() => ({
  borderLeftColor: props.pos.node.color || '#5C6BC0'
}))

const nodeStyle = computed(() => {
  const x = props.liveX != null ? props.liveX : props.pos.x
  const y = props.liveY != null ? props.liveY : props.pos.y

  return {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: `${props.pos.w}px`,
    height: `${props.pos.h}px`,
    zIndex: props.isBeingDragged ? 100 : undefined,
    transition: props.isBeingDragged ? 'none' : undefined
  }
})

const bgStyle = computed(() => {
  const color = props.pos.node.color || '#5C6BC0'
  if (isRoot.value) return { background: color, borderRadius: '25px' }
  if (isLeaf.value) return { background: 'transparent', borderBottom: `2.5px solid ${color}`, borderRadius: '0' }
  return { background: color + '22', border: `2px solid ${color}`, borderRadius: '20px' }
})

function onMouseDown(e) {
  if (e.button !== 0) return
  emit('startDrag', e)
}

function triggerImageUpload() {
  imageInput.value?.click()
}

async function onImageSelected(e) {
  const file = e.target?.files?.[0]
  if (!file) return
  e.target.value = ''
  try {
    const dataUrl = await processImageFile(file)
    emit('setImage', dataUrl)
  } catch (err) {
    console.warn('Ошибка загрузки:', err.message)
  }
}

function onImageDragOver(e) {
  const hasFiles = e.dataTransfer?.types?.includes('Files')
  if (hasFiles) {
    isImageDragOver.value = true
    e.dataTransfer.dropEffect = 'copy'
  }
}

async function onImageDrop(e) {
  isImageDragOver.value = false
  const file = getImageFromDrop(e)
  if (!file) return
  try {
    const dataUrl = await processImageFile(file)
    emit('setImage', dataUrl)
  } catch (err) {
    console.warn('Ошибка загрузки:', err.message)
  }
}

function onImageError(e) {
  console.warn('Image failed to load:', props.pos.node.image?.slice(0, 100))
  // Можно скрыть сломанную картинку
  e.target.style.display = 'none'
}
</script>

<style scoped>
.map-node {
  position: absolute;
  cursor: grab;
  user-select: none;
  transition: transform 0.15s ease, opacity 0.15s ease, left 0.2s ease, top 0.2s ease;
  z-index: 2;
  overflow: visible;
}

.map-node:hover { z-index: 5; }

.map-node--dragging {
  cursor: grabbing;
  opacity: 0.85;
  z-index: 100 !important;
  transition: none !important;
}

.map-node--drag-over .map-node__bg {
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.6) !important;
}

.map-node--image-drop .map-node__bg {
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.6) !important;
}

.map-node--custom::after {
  content: '';
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #FF9800;
  border: 1.5px solid white;
  z-index: 11;
}

/* Картинка над узлом */
.map-node__image-float {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 6px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  background: rgb(var(--v-theme-surface));
  z-index: 3;
  transition: transform 0.2s ease;
}

.map-node:hover .map-node__image-float {
  transform: translateX(-50%) scale(1.03);
}

.map-node__image {
  display: block;
  max-width: 160px;
  max-height: 120px;
  width: auto;
  height: auto;
  object-fit: cover;
}

.map-node--root .map-node__image {
  max-width: 200px;
  max-height: 150px;
}

.map-node__image-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.map-node:hover .map-node__image-remove { opacity: 1; }
.map-node__image-remove:hover { background: rgba(244, 67, 54, 0.9); }

/* Фон */
.map-node__bg {
  position: absolute;
  inset: 0;
  transition: all 0.2s ease;
}

/* Контент */
.map-node__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 4px 12px;
  gap: 6px;
}

.map-node__text {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.map-node--root .map-node__text {
  font-size: 16px;
  font-weight: 700;
  color: white;
  max-width: 140px;
}

.map-node--leaf .map-node__text {
  font-size: 12px;
  font-weight: 400;
}

.map-node__notes-icon {
  opacity: 0.6;
  flex-shrink: 0;
}

.map-node__toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.map-node__toggle:hover { opacity: 1; }

.map-node__badge {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
}

.map-node--root .map-node__badge {
  background: rgba(255, 255, 255, 0.3);
  color: white;
}

.map-node__pin { opacity: 0.4; }

/* ★ Превью заметки — ПОД узлом */
.map-node__notes-preview {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 6px;
  padding: 10px 14px;
  width: max-content;
  min-width: 180px;
  max-width: 280px;
  background: rgb(var(--v-theme-surface));
  border-left: 3px solid;
  border-radius: 0 8px 8px 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  z-index: 1;
  transition: all 0.25s ease;
  overflow: hidden;
}

/* ★ Свёрнутое состояние — ограничение по высоте */
.map-node__notes-preview:not(.map-node__notes-preview--expanded) {
  max-height: 160px;
}

/* ★ Развёрнутое при наведении */
.map-node__notes-preview--expanded {
  max-width: 380px;
  max-height: 500px;
  overflow-y: auto;
  z-index: 50;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  transform: translateY(2px);
}

.map-node__notes-preview--expanded::-webkit-scrollbar {
  width: 4px;
}

.map-node__notes-preview--expanded::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

/* Fade-эффект и подсказка внизу */
.map-node__notes-fade {
  position: relative;
  margin-top: -24px;
  padding-top: 24px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgb(var(--v-theme-surface)) 70%
  );
  text-align: center;
}

.map-node__notes-more {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-style: italic;
}

/* ★ Markdown мини-стили внутри превью */
.markdown-mini {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.8);
  word-break: break-word;
}

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
  border-left: 2px solid rgba(var(--v-theme-primary), 0.4);
  padding: 0.2em 0.6em;
  margin: 0.3em 0;
  background: rgba(var(--v-theme-primary), 0.04);
  border-radius: 0 4px 4px 0;
  font-size: 0.95em;
}

.markdown-mini :deep(code) {
  background: rgba(var(--v-theme-on-surface), 0.07);
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Fira Code', monospace;
}

.markdown-mini :deep(pre) {
  background: rgba(var(--v-theme-on-surface), 0.05);
  padding: 8px 10px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.3em 0;
  font-size: 0.85em;
}

.markdown-mini :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-mini :deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.markdown-mini :deep(strong) { font-weight: 700; }
.markdown-mini :deep(em) { font-style: italic; }

.markdown-mini :deep(hr) {
  border: none;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
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
  border: 1px solid rgba(var(--v-border-color), 0.2);
  padding: 3px 8px;
  text-align: left;
}

.markdown-mini :deep(img) {
  max-width: 100%;
  border-radius: 6px;
  margin: 0.3em 0;
}

/* Кнопки */
.map-node__actions {
  position: absolute;
  top: -10px;
  right: -10px;
  display: flex;
  gap: 3px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.map-node--has-image .map-node__actions {
  top: auto;
  bottom: -10px;
}

.map-node:hover .map-node__actions {
  opacity: 1;
  pointer-events: auto;
}

.map-node__action {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.map-node__action:hover { transform: scale(1.15); }
.map-node__action--add { background: #4CAF50; color: white; }
.map-node__action--edit { background: #2196F3; color: white; }
.map-node__action--delete { background: #F44336; color: white; }
.map-node__action--reset { background: #FF9800; color: white; }
.map-node__action--image { background: #9C27B0; color: white; }
.map-node__action--notes { background: #607D8B; color: white; }
</style>