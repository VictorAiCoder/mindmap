<!-- embed/components/MindMapCanvas.vue -->
<template>
  <div
    class="canvas-wrapper"
    :class="{ 'canvas-wrapper--embed': isEmbed, 'canvas-wrapper--preview': previewMode }"
    ref="wrapperRef"
    @wheel.prevent="handleWheel"
    @mousedown="onCanvasMouseDown"
    @mousemove="onCanvasMouseMove"
    @mouseup="panZoom.endPan"
    @mouseleave="panZoom.endPan"
  >
    <template v-if="layoutData.positions.length">
      <div class="canvas-scene" :style="sceneStyle">
        <svg class="scene-svg">
          <defs v-if="!isEmbed">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="0.5" />
            </pattern>
          </defs>
          <rect v-if="!isEmbed" x="0" y="0" width="100%" height="100%" fill="url(#grid)" />
          <path
            v-for="conn in liveConnections"
            :key="conn.id"
            :d="conn.path"
            :stroke="conn.color"
            stroke-width="2.5"
            fill="none"
            stroke-linecap="round"
            class="conn-line"
          />
        </svg>

        <!-- Edit mode: MapNode -->
        <MapNode
          v-if="!isEmbed"
          v-for="pos in layoutData.positions"
          :key="pos.id"
          :pos="pos"
          :drag="dragStates.get(pos.id)"
          :is-focused="panZoom.focusedNodeId.value === pos.id"
          @command="(cmd) => handleNodeCommand(cmd, pos)"
        />

        <!-- Embed mode: EmbedNode -->
        <EmbedNode
          v-if="isEmbed"
          v-for="pos in layoutData.positions"
          :key="pos.id"
          :pos="pos"
          :show-notes="showNotes"
          :show-images="showImages"
          :image-pool="imagePool"
          @toggle="mindmap.toggleCollapse(pos.id)"
        />

        <template v-if="!isEmbed">
          <NodeActionsMenu />
          <ImportMarkdownHost @sections-imported="onSectionsImported" />
        </template>
      </div>
    </template>

    <div v-else class="d-flex align-center justify-center" style="height: 100%">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Edit-only panels -->
    <template v-if="!isEmbed">
      <!-- Редактирование текста -->
      <div v-if="editingId" class="edit-overlay" @click.self="finishEdit">
        <div class="edit-popup">
          <v-text-field
            ref="editFieldRef"
            v-model="editText"
            variant="outlined"
            density="compact"
            hide-details
            autofocus
            label="Текст узла"
            @keydown.enter="finishEdit"
            @keydown.esc="cancelEdit"
          />
          <div class="d-flex justify-end mt-2 ga-2">
            <v-btn size="small" variant="text" @click="cancelEdit">Отмена</v-btn>
            <v-btn size="small" color="primary" variant="flat" @click="finishEdit">Сохранить</v-btn>
          </div>
        </div>
      </div>

      <NotesPanel :node-id="notesNodeId" @close="notesNodeId = null" />

      <SegmentEditorPanel
        :open="segmentEditorOpen"
        :source-id="segmentEditorSourceId"
        :mindmap="mindmap"
        @close="closeSegmentEditor"
      />

      <ImageGalleryPanel
        v-model="galleryOpenLocal"
        @highlight-nodes="handleHighlightFromGallery"
        @dropped="handleGalleryDropped"
      />

      <DragHint
        :is-dragging="nodeDrag.isDraggingNode.value"
        :has-target="!!nodeDrag.dropTargetId.value"
      />

      <CanvasControls
        :zoom-percent="panZoom.zoomPercent.value"
        @zoom-in="panZoom.zoomIn"
        @zoom-out="panZoom.zoomOut"
        @reset-view="panZoom.resetView"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, provide } from 'vue'

import MapNode from './MapNode.vue'
import NotesPanel from './NotesPanel.vue'
import ImageGalleryPanel from './ImageGalleryPanel.vue'
import DragHint from './DragHint.vue'
import CanvasControls from './CanvasControls.vue'
import NodeActionsMenu from './NodeActionsMenu.vue'
import ImportMarkdownHost from './ImportMarkdownHost.vue'
import SegmentEditorPanel from './SegmentEditorPanel.vue'
import EmbedNode from './EmbedNode.vue'

import { useLayout } from '@features/layout'
import { useNodeDrag } from '../composables/useNodeDrag'
import { usePanZoom } from '../composables/usePanZoom'
import { useConnections } from '../composables/useConnections'
import { usePositionIndex } from '../composables/usePositionIndex'
import { useHitTest } from '../composables/useHitTest'
import { useTextEditor } from '../composables/useTextEditor'
import type { NodeCommand } from '../types/node-command'
import { useNodeOperations } from '../composables/useNodeOperations'

import type { MindMapApi, NotifyFn } from '../types/mindmap-api'
import { mindMapKey, notifyKey, globalZoomKey, imageStorageKey } from '../injection-keys'
import type { LayoutPosition } from '@features/layout'
import type { NodeDragState } from '../types/node-drag'
import type { StoredImage } from '@entities/image'

// ═══════════════════════════════════════════
// Props / Emits
// ═══════════════════════════════════════════

const props = withDefaults(defineProps<{
  api: MindMapApi
  notify?: NotifyFn
  galleryOpen?: boolean
  embed?: boolean
  imagePool?: StoredImage[] | null
  showNotes?: boolean
  showImages?: boolean
  previewMode?: boolean
}>(), {
  galleryOpen: false,
  embed: false,
  imagePool: null,
  showNotes: true,
  showImages: true,
  previewMode: false,
})

const emit = defineEmits<{
  'update:galleryOpen': [value: boolean]
  'notes-visible-change': [payload: { nodeId: string; visible: boolean }]
  'pin-change': [payload: { nodeId: string; pinned: boolean }]
  'child-added': [payload: { parentId: string; nodeId: string; nodeText: string }]
  'sections-imported': [payload: { targetId: string; sections: Array<{ heading: string; content: string }> }]
  'node-image-set': [payload: { nodeId: string; dataUrl: string }]
  'node-image-removed': [payload: { nodeId: string }]
  'node-deleted': [payload: { nodeId: string; nodeText: string }]
}>()

// ═══════════════════════════════════════════
// API access via props (no injection needed)
// ═══════════════════════════════════════════

const mindmap = props.api
const isEmbed = computed(() => props.embed)

const notify: NotifyFn = props.notify ?? ((text, _color = 'success', _icon = 'mdi-check') => {
  console.log(`[MindMapCanvas] ${text}`)
})

// Provide API to child components that use injectStrict(mindMapKey/notifyKey)
if (!isEmbed.value) {
  provide(mindMapKey, mindmap)
  provide(notifyKey, notify)
}

// ═══════════════════════════════════════════
// DOM refs
// ═══════════════════════════════════════════

const wrapperRef = ref<HTMLElement | null>(null)

// ═══════════════════════════════════════════
// Layout — базовый источник позиций
// ═══════════════════════════════════════════

// Vue unwraps refs in provide/inject — mindmap.rootNode is a plain object.
// Wrap in computed so useLayout and useConnections get a proper Ref.
const rootNodeRef = computed(() => mindmap.rootNode)

const { layoutData } = useLayout(rootNodeRef)

const { posById, rootPos, toPositionMap } = usePositionIndex(layoutData)

const { editingId, editText, editFieldRef, startEdit, finishEdit, cancelEdit } =
  isEmbed.value
    ? { editingId: ref(null), editText: ref(''), editFieldRef: ref(null), startEdit: () => {}, finishEdit: () => {}, cancelEdit: () => {} }
    : useTextEditor({ mindmap, posById, emit })

const {
  handleDelete,
  handleResetPosition,
  handleSetImage,
  handleSetImageById,
  handleRemoveImage,
  handleToggleNotePin,
  handleToggleNotesVisible,
} = isEmbed.value
  ? { handleDelete: () => {}, handleResetPosition: () => {}, handleSetImage: () => {}, handleSetImageById: () => {}, handleRemoveImage: () => {}, handleToggleNotePin: () => {}, handleToggleNotesVisible: () => {} }
  : useNodeOperations({ mindmap, notify, emit, posById })

// ═══════════════════════════════════════════
// Pan & Zoom
// ═══════════════════════════════════════════

const panZoom = usePanZoom()

if (!isEmbed.value) {
  provide(globalZoomKey, panZoom.zoom)
  provide(imageStorageKey, props.api.imageStorage)
}

onMounted(async () => {
  panZoom.setWrapper(wrapperRef.value)
  await nextTick()
  if (!isEmbed.value) panZoom.resetView()
})

const sceneStyle = computed(() => {
  const b = layoutData.value.bounds
  return {
    width: `${b.width}px`,
    height: `${b.height}px`,
    transform: `translate(${panZoom.panX.value}px, ${panZoom.panY.value}px) scale(${panZoom.zoom.value})`,
    transformOrigin: '0 0',
    left: `${-b.minX}px`,
    top: `${-b.minY}px`,
    transition: panZoom.isAnimating.value
      ? 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
      : 'none'
  }
})

watch(rootPos, (rp) => {
  if (!rp) return
  const b = layoutData.value.bounds
  panZoom.setBounds(b.minX, b.minY)
  panZoom.setRootSceneCenter(
    rp.x + rp.w / 2,
    rp.y + rp.h / 2
  )
}, { immediate: true })

watch(() => layoutData.value.bounds, (b) => {
  panZoom.setBounds(b.minX, b.minY)
}, { immediate: true, deep: false })


function handleFocusNode(pos: LayoutPosition) {
  panZoom.focusOnNode(pos, rootPos.value, layoutData.value.bounds, wrapperRef.value)
}

// ═══════════════════════════════════════════
// Node Drag
// ═══════════════════════════════════════════

// buildLayoutPositionMap replaced by usePositionIndex.toPositionMap()

const nodeDrag = isEmbed.value
  ? { isDraggingNode: computed(() => false), dropTargetId: ref(null), draggingNodeId: ref(null), dragGroupIds: ref(new Set<string>()), dragDeltaX: computed(() => 0), dragDeltaY: computed(() => 0), getLivePosition: () => null, isInDragGroup: () => false, setDropTarget: () => {}, clearDropTarget: () => {}, startNodeDrag: () => {} }
  : useNodeDrag(mindmap, panZoom.zoom, toPositionMap)

const updateDropTarget = isEmbed.value ? () => {} : useHitTest(layoutData, panZoom, nodeDrag, wrapperRef).updateDropTarget

// ═══════════════════════════════════════════
// Live-состояние узлов при drag'е
// ═══════════════════════════════════════════

const livePositions = computed(() => {
  const map = new Map<string, { x: number; y: number }>()
  for (const pos of layoutData.value.positions) {
    const live = nodeDrag.getLivePosition(pos.id, pos.x, pos.y)
    if (live) map.set(pos.id, live)
  }
  return map
})

const dragStates = computed<Map<string, NodeDragState>>(() => {
  const map = new Map<string, NodeDragState>()
  const draggedOverId = nodeDrag.dropTargetId.value
  const beingDraggedId = nodeDrag.draggingNodeId.value
  const lives = livePositions.value

  for (const pos of layoutData.value.positions) {
    const live = lives.get(pos.id)
    map.set(pos.id, {
      isDraggedOver: draggedOverId === pos.id,
      isBeingDragged: beingDraggedId === pos.id,
      isInDragGroup: nodeDrag.isInDragGroup(pos.id),
      liveX: live?.x ?? null,
      liveY: live?.y ?? null,
    })
  }
  return map
})

// ═══════════════════════════════════════════
// Live Connections
// ═══════════════════════════════════════════

const liveConnections = useConnections(
  rootNodeRef,
  layoutData,
  nodeDrag.getLivePosition
)

// Hit-test — delegated to useHitTest

// ═══════════════════════════════════════════
// Canvas Mouse Events (pan + drop-target tracking)
// ═══════════════════════════════════════════

function onCanvasMouseDown(e: MouseEvent) {
  if (isEmbed.value) {
    if (!props.previewMode) panZoom.startPan(e)
    return
  }
  if (nodeDrag.isDraggingNode.value) return

  const target = e.target as HTMLElement | null
  if (target?.closest('.node-image-resize')) return
  if (target?.closest('.map-node') || target?.closest('.edit-overlay')) return

  panZoom.startPan(e)
}

function onCanvasMouseMove(e: MouseEvent) {
  if (panZoom.isPanning.value) {
    panZoom.movePan(e)
    return
  }
  if (!isEmbed.value && nodeDrag.isDraggingNode.value) {
    updateDropTarget(e)
  }
}

function handleWheel(e: WheelEvent) {
  if (props.previewMode) return
  panZoom.onWheel(e, wrapperRef.value)
}

// ═══════════════════════════════════════════
// Inline text editor — delegated to useTextEditor
// ═══════════════════════════════════════════

function onSectionsImported(payload: { targetId: string; sections: Array<{ heading: string; content: string }> }) {
  emit('sections-imported', payload)
}

// ═══════════════════════════════════════════
// CRUD Handlers — delegated to useNodeOperations
// ═══════════════════════════════════════════

function handleNodeCommand(cmd: NodeCommand, pos: LayoutPosition) {
  switch (cmd.type) {
    case 'edit': startEdit(pos.id); break
    case 'addChild': handleAddChild(pos.id); break
    case 'delete': handleDelete(pos.id); break
    case 'toggle': mindmap.toggleCollapse(pos.id); break
    case 'resetPosition': handleResetPosition(pos.id); break
    case 'startDrag': nodeDrag.startNodeDrag(cmd.event, pos.id, pos.x, pos.y); break
    case 'setImage': handleSetImage(pos.id, cmd.dataUrl); break
    case 'setImageById': handleSetImageById(pos.id, cmd.imageId); break
    case 'removeImage': handleRemoveImage(pos.id); break
    case 'resizeImage': mindmap.setImageWidth(pos.id, cmd.width); break
    case 'resizeImageCommit': mindmap.commitImageResize(pos.id, cmd.width); break
    case 'openNotes': notesNodeId.value = pos.id; break
    case 'toggleNotePin': handleToggleNotePin(pos.id); break
    case 'toggleNotesVisible': handleToggleNotesVisible(pos.id); break
    case 'focusNode': handleFocusNode(pos); break
    case 'editSegments': handleEditSegment(pos.id); break
  }
}

function handleAddChild(parentId: string) {
  const newId = mindmap.addChild(parentId)
  if (newId) nextTick(() => startEdit(newId))
}

// ═══════════════════════════════════════════
// Notes Panel
// ═══════════════════════════════════════════

const notesNodeId = ref<string | null>(null)

// ═══════════════════════════════════════════
// Gallery Panel
// ═══════════════════════════════════════════

const galleryOpenLocal = computed<boolean>({
  get: () => props.galleryOpen,
  set: (v) => emit('update:galleryOpen', v)
})

function handleHighlightFromGallery(nodeIds: string[]) {
  if (nodeIds.length === 0) return
  // Ищем первый узел из списка, который реально есть на карте — через O(1) индекс.
  for (const id of nodeIds) {
    const pos = posById.value.get(id)
    if (pos) {
      handleFocusNode(pos)
      return
    }
  }
}

/**
 * Закрываем галерею после удачного drop картинки в узел.
 * Плюс принудительно снимаем глобальный класс, чтобы оверлей
 * гарантированно вернул свой обычный вид (на случай, если dragend
 * в карточке не выстрелит до размонтирования drawer'а).
 */
function handleGalleryDropped() {
  document.body.classList.remove('mindmap-dragging-image')
  galleryOpenLocal.value = false
}

// ═══════════════════════════════════════════
// Segment Editor
// ═══════════════════════════════════════════

const segmentEditorOpen = ref<boolean>(false)
const segmentEditorSourceId = ref<string | null>(null)

/**
 * Открыть редактор сегментов для картинки узла.
 *
 * Логика:
 *  - У узла должна быть привязана картинка (imageId).
 *  - Если картинка — raw, редактируем её сегменты напрямую.
 *  - Если картинка — segment (узел показывает сегмент),
 *    редактируем сегменты её источника (sourceId).
 *  - В обоих случаях открывается редактор для raw-источника.
 */
function handleEditSegment(nodeId: string) {
  const node = mindmap.findNode(nodeId)
  if (!node?.imageId) {
    notify('У узла нет картинки', 'warning', 'mdi-image-off')
    return
  }

  const img = mindmap.imageStorage?.images?.value?.find?.(i => i.id === node.imageId)
  if (!img) {
    notify('Картинка не найдена', 'error', 'mdi-alert')
    return
  }

  const sourceId = img.kind === 'raw' ? img.id : img.sourceId

  const source = mindmap.imageStorage?.images?.value?.find?.(i => i.id === sourceId)
  if (!source || source.kind !== 'raw') {
    notify('Не удалось найти исходную картинку', 'error', 'mdi-alert')
    return
  }

  segmentEditorSourceId.value = sourceId
  segmentEditorOpen.value = true
}

function closeSegmentEditor() {
  segmentEditorOpen.value = false
  segmentEditorSourceId.value = null
}
</script>

<style scoped>
.canvas-wrapper {
  --enc-background:rgb(49 52 51 / 28%);
  width: 100%;
  height: calc(100vh - 64px);
  overflow: hidden;
  position: relative;
  cursor: grab;
  background: var(--enc-background);
}

.canvas-wrapper:active { cursor: grabbing; }
.canvas-scene { position: absolute; }

.scene-svg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  overflow: visible;
  pointer-events: none;
}

.conn-line {
  opacity: 0.65;
  transition: opacity 0.2s, d 0.15s ease;
}

.edit-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-popup {
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  padding: 16px;
  min-width: 300px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

/* Embed mode */
.canvas-wrapper--embed {
  cursor: default;
}
.canvas-wrapper--embed:active {
  cursor: default;
}
.canvas-wrapper--preview {
  cursor: default;
  pointer-events: none;
}
</style>
