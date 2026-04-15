<!-- src/components/canvas/MindMapCanvas.vue -->
<template>
  <div
    class="canvas-wrapper"
    ref="wrapperRef"
    @wheel.prevent="panZoom.onWheel"
    @mousedown="onCanvasMouseDown"
    @mousemove="onCanvasMouseMove"
    @mouseup="panZoom.endPan"
    @mouseleave="panZoom.endPan"
  >
    <template v-if="mindmap && layoutData.positions.length">
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
          :live-x="getLiveX(pos)"
          :live-y="getLiveY(pos)"
          @edit="startEdit(pos.id)"
          @add-child="handleAddChild(pos.id)"
          @delete="handleDelete(pos.id)"
          @toggle="mindmap.toggleCollapse(pos.id)"
          @reset-position="handleResetPosition(pos.id)"
          @start-drag="(e) => nodeDrag.startNodeDrag(e, pos.id, pos.x, pos.y)"
          @set-image="(url) => handleSetImage(pos.id, url)"
          @remove-image="handleRemoveImage(pos.id)"
          @resize-image="(w) => mindmap.setImageWidth(pos.id, w)"
          @resize-image-commit="(w) => mindmap.commitImageResize(pos.id, w)"
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

<script setup>
import { ref, computed, inject, nextTick } from 'vue'
import MapNode from '../node/MapNode.vue'
import NotesPanel from '../panels/NotesPanel.vue'
import DragHint from './DragHint.vue'
import CanvasControls from './CanvasControls.vue'
import { useLayout } from '../../composables/layout/useLayout'
import { useNodeDrag } from '../../composables/drag/useNodeDrag'
import { usePanZoom } from '../../composables/canvas/usePanZoom'
import NodeActionsMenu from '../node/NodeActionsMenu.vue'

const mindmap = inject('mindmap', null)
const notify = inject('notify', () => {})

const wrapperRef = ref(null)

// ─── Layout ─────────────────────────────────

const emptyLayout = {
  positions: [],
  bounds: { minX: 0, minY: 0, maxX: 1600, maxY: 900, width: 1600, height: 900 }
}

const { layoutData: rawLayout } = mindmap
  ? useLayout(mindmap.rootNode)
  : { layoutData: computed(() => emptyLayout) }

const layoutData = computed(() => rawLayout?.value ?? emptyLayout)

// ─── Pan & Zoom ─────────────────────────────

const panZoom = usePanZoom()

const sceneStyle = computed(() => {
  const b = layoutData.value.bounds
  return {
    width: `${b.width}px`,
    height: `${b.height}px`,
    transform: `translate(${panZoom.panX.value}px, ${panZoom.panY.value}px) scale(${panZoom.zoom.value})`,
    transformOrigin: '0 0',
    left: `${-b.minX}px`,
    top: `${-b.minY}px`,
    // ★ Плавная анимация только при focusOnNode
    transition: panZoom.isAnimating.value
      ? 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
      : 'none'
  }
})

// ─── Focus on Node ──────────────────────────

const rootPos = computed(() =>
  layoutData.value.positions.find(p => p.depth === 0) ?? null
)

function handleFocusNode(pos) {
  panZoom.focusOnNode(
    pos,
    rootPos.value,
    layoutData.value.bounds,
    wrapperRef.value
  )
}

// ─── Node Drag ──────────────────────────────

const nodeDrag = useNodeDrag(mindmap, panZoom.zoom)

/**
 * ★ Подменяем finishDrag чтобы передать layoutPositions
 *   для узлов без custom-координат
 */
const originalMoveNodeGroup = mindmap?.moveNodeGroup
if (mindmap) {
  const _original = mindmap.moveNodeGroup
  mindmap.moveNodeGroup = (nodeId, dx, dy) => {
    const posMap = buildLayoutPositionMap()
    _original(nodeId, dx, dy, posMap)
  }
}

function buildLayoutPositionMap() {
  const map = new Map()
  for (const pos of layoutData.value.positions) {
    map.set(pos.id, { x: pos.x, y: pos.y })
  }
  return map
}

/**
 * ★ Вычисляет live-координаты для любого узла из drag-группы
 */
function getLiveX(pos) {
  const live = nodeDrag.getLivePosition(pos.id, pos.x, pos.y)
  return live ? live.x : null
}

function getLiveY(pos) {
  const live = nodeDrag.getLivePosition(pos.id, pos.x, pos.y)
  return live ? live.y : null
}

// ─── Drop Target Detection ──────────────────

const HIT_PADDING = 8

function updateDropTarget(e) {
  const wrapper = wrapperRef.value
  if (!wrapper) return

  const rect = wrapper.getBoundingClientRect()
  const bounds = layoutData.value.bounds
  const world = panZoom.screenToScene(e.clientX, e.clientY, rect, bounds)

  let found = null

  for (const pos of layoutData.value.positions) {
    // ★ Пропускаем все узлы из drag-группы
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

  if (found) {
    nodeDrag.setDropTarget(found)
  } else {
    nodeDrag.clearDropTarget()
  }
}

// ─── Canvas Mouse Events ────────────────────

function onCanvasMouseDown(e) {
  if (nodeDrag.isDraggingNode.value) return
  // ★ Не начинаем pan если кликнули на resize handle
  if (e.target.closest('.node-image-resize')) return
  if (e.target.closest('.map-node') || e.target.closest('.edit-overlay')) return
  panZoom.startPan(e)
}

function onCanvasMouseMove(e) {
  if (panZoom.isPanning.value) {
    panZoom.movePan(e)
    return
  }

  if (nodeDrag.isDraggingNode.value) {
    updateDropTarget(e)
  }
}


// ─── Live Connections ───────────────────────

const liveConnections = computed(() => {
  const positions = layoutData.value.positions
  if (!positions.length) return []

  const posMap = buildLivePositionMap(positions)
  const root = mindmap?.rootNode?.value
  if (!root) return []

  const result = []
  buildConnectionsRecursive(root, posMap, result)
  return result
})

function buildLivePositionMap(positions) {
  const map = new Map()

  for (const pos of positions) {
    const lx = getLiveX(pos)
    const ly = getLiveY(pos)
    map.set(pos.id, {
      ...pos,
      x: lx ?? pos.x,
      y: ly ?? pos.y
    })
  }

  return map
}

function buildConnectionsRecursive(node, posMap, result) {
  if (node.collapsed || !node.children?.length) return

  const parentPos = posMap.get(node.id)
  if (!parentPos) return

  for (const child of node.children) {
    const childPos = posMap.get(child.id)
    if (!childPos) continue

    result.push({
      id: `${node.id}__${child.id}`,
      path: calcBezierPath(parentPos, childPos),
      color: child.color || '#999'
    })

    buildConnectionsRecursive(child, posMap, result)
  }
}

function calcBezierPath(parent, child) {
  const pCx = parent.x + parent.w / 2
  const cCx = child.x + child.w / 2

  let sx, sy, ex, ey

  if (cCx >= pCx) {
    sx = parent.x + parent.w; sy = parent.y + parent.h / 2
    ex = child.x;             ey = child.y + child.h / 2
  } else {
    sx = parent.x;            sy = parent.y + parent.h / 2
    ex = child.x + child.w;   ey = child.y + child.h / 2
  }

  const dist = Math.abs(ex - sx)
  const dx = Math.min(dist * 0.45, 80)
  const isRight = ex > sx
  const cp1x = isRight ? sx + dx : sx - dx
  const cp2x = isRight ? ex - dx : ex + dx

  return `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ey}, ${ex} ${ey}`
}

// ─── Edit ───────────────────────────────────

const editingId = ref(null)
const editText = ref('')
const editFieldRef = ref(null)

function startEdit(nodeId) {
  const pos = layoutData.value.positions.find(p => p.id === nodeId)
  if (!pos) return
  editingId.value = nodeId
  editText.value = pos.node.text
  nextTick(() => editFieldRef.value?.focus())
}

function finishEdit() {
  if (!editingId.value) return
  const trimmed = editText.value.trim()
  if (trimmed) mindmap?.updateText(editingId.value, trimmed)
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

// ─── CRUD Handlers ──────────────────────────

function handleAddChild(parentId) {
  const newId = mindmap?.addChild(parentId)
  if (newId) nextTick(() => startEdit(newId))
}

function handleDelete(nodeId) {
  const pos = layoutData.value.positions.find(p => p.id === nodeId)
  mindmap?.deleteNode(nodeId)
  if (pos) notify(`Узел «${pos.node.text}» удалён`, 'error', 'mdi-delete')
}

function handleResetPosition(nodeId) {
  mindmap?.updateNodePosition(nodeId, null, null)
  notify('Позиция сброшена', 'info', 'mdi-pin-off')
}

function handleSetImage(nodeId, dataUrl) {
  mindmap?.setNodeImage(nodeId, dataUrl)
  notify('Картинка добавлена', 'success', 'mdi-image')
}

function handleRemoveImage(nodeId) {
  mindmap?.removeNodeImage(nodeId)
  notify('Картинка удалена', 'info', 'mdi-image-off')
}

// ─── Notes Panel ────────────────────────────
function handleToggleNotePin(nodeId) {
  mindmap.toggleNotePin(nodeId);
}
function handleToggleNotesVisible(nodeId) {
  mindmap.toggleNotesVisible(nodeId)
}

const notesNodeId = ref(null)
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