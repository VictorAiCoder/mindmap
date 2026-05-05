<!-- src/components/canvas/MindMapCanvas.vue -->
<template>
  <div
    class="canvas-wrapper"
    ref="wrapperRef"
    @wheel.prevent="(e: WheelEvent) => panZoom.onWheel(e, wrapperRef)"
    @mousedown="onCanvasMouseDown"
    @mousemove="onCanvasMouseMove"
    @mouseup="panZoom.endPan"
    @mouseleave="panZoom.endPan"
  >
    <template v-if="layoutData.positions.length">
      <div class="canvas-scene" :style="sceneStyle">
        <svg class="scene-svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="0.5" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" />
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

        <MapNode
          v-for="pos in layoutData.positions"
          :key="pos.id"
          :pos="pos"
          :drag="dragStates.get(pos.id)"
          :is-focused="panZoom.focusedNodeId.value === pos.id"
          @edit="startEdit(pos.id)"
          @add-child="handleAddChild(pos.id)"
          @delete="handleDelete(pos.id)"
          @toggle="mindmap.toggleCollapse(pos.id)"
          @reset-position="handleResetPosition(pos.id)"
          @start-drag="(e: MouseEvent) => nodeDrag.startNodeDrag(e, pos.id, pos.x, pos.y)"
          @set-image="(url: string) => handleSetImage(pos.id, url)"
          @set-image-by-id="(imageId: string) => handleSetImageById(pos.id, imageId)"
          @remove-image="handleRemoveImage(pos.id)"
          @resize-image="(w: number) => mindmap.setImageWidth(pos.id, w)"
          @resize-image-commit="(w: number) => mindmap.commitImageResize(pos.id, w)"
          @open-notes="notesNodeId = pos.id"
          @toggle-note-pin="handleToggleNotePin(pos.id)"
          @toggle-notes-visible="handleToggleNotesVisible(pos.id)"
          @focus-node="handleFocusNode(pos)"
          @edit-segments="handleEditSegment(pos.id)"
        />
        <NodeActionsMenu />
      </div>
    </template>

    <div v-else class="d-flex align-center justify-center" style="height: 100%">
      <v-progress-circular indeterminate color="primary" />
    </div>

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

    <!-- Панель заметок (справа) -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, provide } from 'vue'

import MapNode from '../node/MapNode.vue'
import NotesPanel from '../panels/NotesPanel.vue'
import ImageGalleryPanel from '../panels/ImageGalleryPanel.vue'
import DragHint from './DragHint.vue'
import CanvasControls from './CanvasControls.vue'
import NodeActionsMenu from '../node/NodeActionsMenu.vue'
import SegmentEditorPanel from '../panels/segment-editor/SegmentEditorPanel.vue'

import { useLayout } from '@features/layout'
import { useNodeDrag } from '../../composables/drag/useNodeDrag'
import { usePanZoom } from '../../composables/canvas/usePanZoom'
import { useConnections } from '../../composables/canvas/useConnections'

import { injectStrict } from '@shared/lib/injectStrict'
import { mindMapKey, notifyKey } from '../../types/injection-keys'

import type { LayoutPosition, PositionMap } from '@features/layout'
import type { NodeDragState } from '../../types/node-drag'

// ═══════════════════════════════════════════
// Props / Emits
// ═══════════════════════════════════════════

const props = withDefaults(defineProps<{
  galleryOpen?: boolean
}>(), {
  galleryOpen: false
})

const emit = defineEmits<{
  'update:galleryOpen': [value: boolean]
}>()

// ═══════════════════════════════════════════
// Инжекции и глобальный провайд
// ═══════════════════════════════════════════

const mindmap = injectStrict(mindMapKey)
const notify = injectStrict(notifyKey)

// ═══════════════════════════════════════════
// DOM refs
// ═══════════════════════════════════════════

const wrapperRef = ref<HTMLElement | null>(null)
const editFieldRef = ref<{ focus: () => void } | null>(null)

// ═══════════════════════════════════════════
// Layout — базовый источник позиций
// ═══════════════════════════════════════════

const { layoutData } = useLayout(mindmap.rootNode)

/**
 * Индекс позиций по id для O(1) поиска.
 * Используется при handleDelete / startEdit / handleHighlightFromGallery.
 * Пересобирается при каждом изменении layoutData — обычно редко.
 */
const posById = computed<Map<string, LayoutPosition>>(() => {
  const map = new Map<string, LayoutPosition>()
  for (const pos of layoutData.value.positions) {
    map.set(pos.id, pos)
  }
  return map
})

const rootPos = computed<LayoutPosition | null>(() => {
  for (const pos of layoutData.value.positions) {
    if (pos.depth === 0) return pos
  }
  return null
})

// ═══════════════════════════════════════════
// Pan & Zoom
// ═══════════════════════════════════════════

const panZoom = usePanZoom()

provide('globalZoom', panZoom.zoom)
provide('imageStorage', mindmap.imageStorage)

onMounted(async () => {
  panZoom.setWrapper(wrapperRef.value)
  await nextTick()
  panZoom.resetView()
  
  setTimeout(() => {
    const wrapper = wrapperRef.value
    if (!wrapper) return
    const wrapperRect = wrapper.getBoundingClientRect()
    
    // ВСЯ сцена
    const sceneEl = wrapper.querySelector('.canvas-scene') as HTMLElement
    const sr = sceneEl?.getBoundingClientRect()
    
    // ROOT узел — найти первый с классом map-node--root
    const rootEl = wrapper.querySelector('.map-node--root') as HTMLElement
    const rr = rootEl?.getBoundingClientRect()
    
    console.log('[POST-RESET-DOM-V2]', {
      wrapper: { l: wrapperRect.left, t: wrapperRect.top, w: wrapperRect.width },
      wrapperCenter: { x: wrapperRect.width / 2, y: wrapperRect.height / 2 },
      sceneRel: sr ? { l: sr.left - wrapperRect.left, t: sr.top - wrapperRect.top, w: sr.width, h: sr.height } : null,
      rootRel: rr ? { 
        l: rr.left - wrapperRect.left, 
        t: rr.top - wrapperRect.top, 
        w: rr.width, 
        h: rr.height,
        centerX: rr.left + rr.width/2 - wrapperRect.left,
        centerY: rr.top + rr.height/2 - wrapperRect.top,
      } : null,
      rootPosLayout: rootPos.value ? { x: rootPos.value.x, y: rootPos.value.y, w: rootPos.value.w, h: rootPos.value.h } : null,
      pan: { x: panZoom.panX.value, y: panZoom.panY.value },
      zoom: panZoom.zoom.value,
      bounds: { ...layoutData.value.bounds }
    })
  }, 700)
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

function buildLayoutPositionMap(): PositionMap {
  const map: PositionMap = new Map()
  for (const pos of layoutData.value.positions) {
    map.set(pos.id, { x: pos.x, y: pos.y })
  }
  return map
}

const nodeDrag = useNodeDrag(
  mindmap,
  panZoom.zoom,
  buildLayoutPositionMap
)

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
  mindmap.rootNode,
  layoutData,
  nodeDrag.getLivePosition
)

// ═══════════════════════════════════════════
// Drop Target Detection (hit-test на mousemove)
// ═══════════════════════════════════════════

/** Толерантность прицела при поиске drop-target'а (в координатах сцены, px). */
const HIT_PADDING = 8

function updateDropTarget(e: MouseEvent) {
  const wrapper = wrapperRef.value
  if (!wrapper) return

  const rect = wrapper.getBoundingClientRect()
  const bounds = layoutData.value.bounds
  const world = panZoom.screenToScene(e.clientX, e.clientY, rect, bounds)

  let found: string | null = null

  // Hit-test остаётся O(N) — пространственный индекс пока не оправдан.
  for (const pos of layoutData.value.positions) {
    if (nodeDrag.isInDragGroup(pos.id)) continue

    if (
      world.x >= pos.x - HIT_PADDING &&
      world.x <= pos.x + pos.w + HIT_PADDING &&
      world.y >= pos.y - HIT_PADDING &&
      world.y <= pos.y + pos.h + HIT_PADDING
    ) {
      found = pos.id
      break
    }
  }

  if (found) nodeDrag.setDropTarget(found)
  else nodeDrag.clearDropTarget()
}

// ═══════════════════════════════════════════
// Canvas Mouse Events (pan + drop-target tracking)
// ═══════════════════════════════════════════

function onCanvasMouseDown(e: MouseEvent) {
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
  if (nodeDrag.isDraggingNode.value) {
    updateDropTarget(e)
  }
}

// ═══════════════════════════════════════════
// Inline text editor
// ═══════════════════════════════════════════

const editingId = ref<string | null>(null)
const editText = ref<string>('')

function startEdit(nodeId: string) {
  const pos = posById.value.get(nodeId)
  if (!pos) return
  editingId.value = nodeId
  editText.value = pos.node.text
  nextTick(() => editFieldRef.value?.focus())
}

function finishEdit() {
  if (!editingId.value) return
  const trimmed = editText.value.trim()
  if (trimmed) mindmap.updateText(editingId.value, trimmed)
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

// ═══════════════════════════════════════════
// CRUD Handlers (с уведомлениями)
// ═══════════════════════════════════════════

function handleAddChild(parentId: string) {
  const newId = mindmap.addChild(parentId)
  if (newId) nextTick(() => startEdit(newId))
}

function handleDelete(nodeId: string) {
  const pos = posById.value.get(nodeId)
  mindmap.deleteNode(nodeId)
  if (pos) notify(`Узел «${pos.node.text}» удалён`, 'error', 'mdi-delete')
}

function handleResetPosition(nodeId: string) {
  mindmap.updateNodePosition(nodeId, null, null)
  notify('Позиция сброшена', 'info', 'mdi-pin-off')
}

function handleSetImage(nodeId: string, dataUrl: string) {
  mindmap.setNodeImage(nodeId, dataUrl)
  notify('Картинка добавлена', 'success', 'mdi-image')
}

function handleSetImageById(nodeId: string, imageId: string) {
  mindmap.setNodeImageById(nodeId, imageId)
  notify('Картинка прикреплена', 'success', 'mdi-image-check')
}

function handleRemoveImage(nodeId: string) {
  mindmap.removeNodeImage(nodeId)
  notify('Картинка удалена', 'info', 'mdi-image-off')
}

// ═══════════════════════════════════════════
// Notes Panel
// ═══════════════════════════════════════════

const notesNodeId = ref<string | null>(null)

function handleToggleNotePin(nodeId: string) {
  mindmap.toggleNotePin(nodeId)
}

function handleToggleNotesVisible(nodeId: string) {
  mindmap.toggleNotesVisible(nodeId)
}

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

  const img = mindmap.imageStorage.images.value.find(i => i.id === node.imageId)
  if (!img) {
    notify('Картинка не найдена', 'error', 'mdi-alert')
    return
  }

  const sourceId = img.kind === 'raw' ? img.id : img.sourceId

  const source = mindmap.imageStorage.images.value.find(i => i.id === sourceId)
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
  width: 100%;
  height: calc(100vh - 64px);
  overflow: hidden;
  position: relative;
  cursor: grab;
  background: rgb(var(--v-theme-background));
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
</style>