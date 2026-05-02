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
          :is-dragged-over="nodeDrag.dropTargetId.value === pos.id"
          :is-being-dragged="nodeDrag.draggingNodeId.value === pos.id"
          :is-in-drag-group="nodeDrag.isInDragGroup(pos.id)"
          :is-focused="panZoom.focusedNodeId.value === pos.id"
          :live-x="livePositions.get(pos.id)?.x"
          :live-y="livePositions.get(pos.id)?.y"
          @edit="startEdit(pos.id)"
          @add-child="handleAddChild(pos.id)"
          @delete="handleDelete(pos.id)"
          @toggle="mindmap.toggleCollapse(pos.id)"
          @reset-position="handleResetPosition(pos.id)"
          @start-drag="(e: MouseEvent) => nodeDrag.startNodeDrag(e, pos.id, pos.x, pos.y)"
          @set-image="(url: string) => handleSetImage(pos.id, url)"
          @remove-image="handleRemoveImage(pos.id)"
          @resize-image="(w: number) => mindmap.setImageWidth(pos.id, w)"
          @resize-image-commit="(w: number) => mindmap.commitImageResize(pos.id, w)"
          @open-notes="notesNodeId = pos.id"
          @toggle-note-pin="handleToggleNotePin(pos.node.id)"
          @toggle-notes-visible="handleToggleNotesVisible(pos.node.id)"
          @focus-node="handleFocusNode(pos)"
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

    <NotesPanel :node-id="notesNodeId" @close="notesNodeId = null" />

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
import DragHint from './DragHint.vue'
import CanvasControls from './CanvasControls.vue'
import NodeActionsMenu from '../node/NodeActionsMenu.vue'

import { useLayout } from '../../composables/layout/useLayout'
import { useNodeDrag } from '../../composables/drag/useNodeDrag'
import { usePanZoom } from '../../composables/canvas/usePanZoom'
import { useConnections } from '../../composables/canvas/useConnections'

import { injectStrict } from '../../utils/injectStrict'
import { mindMapKey, notifyKey } from '../../types/injection-keys'

import type { LayoutPosition, PositionMap } from '../../types/layout'

// ─── Инжекции ───────────────────────────────
const mindmap = injectStrict(mindMapKey)
const notify = injectStrict(notifyKey)

// ─── DOM refs ───────────────────────────────
const wrapperRef = ref<HTMLElement | null>(null)
const editFieldRef = ref<{ focus: () => void } | null>(null)

// ─── Layout ─────────────────────────────────
const { layoutData } = useLayout(mindmap.rootNode)

// ─── Pan & Zoom ─────────────────────────────
const panZoom = usePanZoom()

provide('globalZoom', panZoom.zoom)
provide('imageStorage', mindmap.imageStorage)

onMounted(() => {
  panZoom.setWrapper(wrapperRef.value)
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

// ─── Focus on Node ──────────────────────────
const rootPos = computed<LayoutPosition | null>(() =>
  layoutData.value.positions.find(p => p.depth === 0) ?? null
)

watch(rootPos, (rp) => {
  if (!rp) return
  const b = layoutData.value.bounds
  panZoom.setRootSceneCenter(
    rp.x - b.minX + rp.w / 2,
    rp.y - b.minY + rp.h / 2
  )
}, { immediate: true })

function handleFocusNode(pos: LayoutPosition) {
  panZoom.focusOnNode(
    pos,
    rootPos.value,
    layoutData.value.bounds,
    wrapperRef.value
  )
}

// ─── Node Drag ──────────────────────────────
// Сбор live-позиций для узлов без customX/Y.
// Передаётся в useNodeDrag — он вызовет функцию при finishDrag
// и передаст результат в mindmap.moveNodeGroup.
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

// ─── Live-координаты для узлов из drag-группы ─
const livePositions = computed(() => {
  const map = new Map<string, { x: number; y: number }>()
  for (const pos of layoutData.value.positions) {
    const live = nodeDrag.getLivePosition(pos.id, pos.x, pos.y)
    if (live) map.set(pos.id, live)
  }
  return map
})

// ─── Live Connections ───────────────────────
const liveConnections = useConnections(
  mindmap.rootNode,
  layoutData,
  nodeDrag.getLivePosition
)

// ─── Drop Target Detection ──────────────────
const HIT_PADDING = 8

function updateDropTarget(e: MouseEvent) {
  const wrapper = wrapperRef.value
  if (!wrapper) return

  const rect = wrapper.getBoundingClientRect()
  const bounds = layoutData.value.bounds
  const world = panZoom.screenToScene(e.clientX, e.clientY, rect, bounds)

  let found: string | null = null

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

// ─── Canvas Mouse Events ────────────────────
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

// ─── Edit ───────────────────────────────────
const editingId = ref<string | null>(null)
const editText = ref<string>('')

function startEdit(nodeId: string) {
  const pos = layoutData.value.positions.find(p => p.id === nodeId)
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

// ─── CRUD Handlers ──────────────────────────
function handleAddChild(parentId: string) {
  const newId = mindmap.addChild(parentId)
  if (newId) nextTick(() => startEdit(newId))
}

function handleDelete(nodeId: string) {
  const pos = layoutData.value.positions.find(p => p.id === nodeId)
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

function handleRemoveImage(nodeId: string) {
  mindmap.removeNodeImage(nodeId)
  notify('Картинка удалена', 'info', 'mdi-image-off')
}

// ─── Notes Panel ────────────────────────────
const notesNodeId = ref<string | null>(null)

function handleToggleNotePin(nodeId: string) {
  mindmap.toggleNotePin(nodeId)
}

function handleToggleNotesVisible(nodeId: string) {
  mindmap.toggleNotesVisible(nodeId)
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