<!-- src/components/MindMapCanvas.vue -->
<template>
  <div
    class="canvas-wrapper"
    ref="wrapperRef"
    @wheel.prevent="onWheel"
    @mousedown="onPanStart"
    @mousemove="onPanMove"
    @mouseup="onPanEnd"
    @mouseleave="onPanEnd"
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
          :is-dragged-over="dragOverId === pos.id"
          :is-being-dragged="nodeDrag.draggingNodeId.value === pos.id"
          :live-x="getLiveX(pos)"
          :live-y="getLiveY(pos)"
          @edit="startEdit(pos.id)"
          @add-child="handleAddChild(pos.id)"
          @delete="handleDelete(pos.id)"
          @toggle="mindmap.toggleCollapse(pos.id)"
          @reset-position="handleResetNodePosition(pos.id)"
          @start-drag="(e) => nodeDrag.startNodeDrag(e, pos.id, pos.x, pos.y)"
          @drag-over="dragOverId = pos.id"
          @drag-leave="dragOverId = null"
          @drop="onNodeDrop(pos.id)"
          @set-image="(dataUrl) => handleSetImage(pos.id, dataUrl)"
          @remove-image="handleRemoveImage(pos.id)"
          @open-notes="notesNodeId = pos.id"
        />
      </div>
    </template>

    <div v-else class="d-flex align-center justify-center" style="height: 100%">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Редактирование текста узла -->
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

    <!-- ★ Панель заметок -->
    <NotesPanel
      :node-id="notesNodeId"
      @close="notesNodeId = null"
    />

    <!-- Зум -->
    <div class="zoom-controls">
      <v-btn icon="mdi-plus" size="small" variant="tonal" @click="zoomIn" />
      <v-chip size="small" variant="tonal" class="my-1">{{ zoomPercent }}%</v-chip>
      <v-btn icon="mdi-minus" size="small" variant="tonal" @click="zoomOut" />
      <v-btn icon="mdi-fit-to-screen" size="small" variant="tonal" class="mt-1" @click="resetView" />
      <v-divider class="my-1" />
      <v-tooltip text="Авто-раскладка" location="left">
        <template #activator="{ props: tip }">
          <v-btn v-bind="tip" icon="mdi-auto-fix" size="small" variant="tonal" @click="handleAutoLayout" />
        </template>
      </v-tooltip>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, nextTick } from 'vue'
import MapNode from './MapNode.vue'
import NotesPanel from './NotesPanel.vue'
import { useLayout } from '../composables/useLayout'
import { useNodeDrag } from '../composables/useNodeDrag'

const mindmap = inject('mindmap', null)
const notify = inject('notify', () => {})

// Layout
const emptyLayout = {
  positions: [],
  connections: [],
  bounds: { minX: 0, minY: 0, maxX: 1600, maxY: 900, width: 1600, height: 900 }
}

const { layoutData: rawLayout } = mindmap
  ? useLayout(mindmap.rootNode)
  : { layoutData: computed(() => emptyLayout) }

const layoutData = computed(() => rawLayout?.value ?? emptyLayout)

// Pan & Zoom
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const lastMouse = { x: 0, y: 0 }
const lastPan = { x: 0, y: 0 }

const zoomPercent = computed(() => Math.round(zoom.value * 100))

const sceneStyle = computed(() => {
  const b = layoutData.value.bounds
  return {
    width: `${b.width}px`,
    height: `${b.height}px`,
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
    transformOrigin: '0 0',
    left: `${-b.minX}px`,
    top: `${-b.minY}px`
  }
})

function onWheel(e) {
  const delta = e.deltaY > 0 ? -0.08 : 0.08
  zoom.value = Math.max(0.2, Math.min(3, zoom.value + delta))
}

function zoomIn() { zoom.value = Math.min(3, zoom.value + 0.15) }
function zoomOut() { zoom.value = Math.max(0.2, zoom.value - 0.15) }
function resetView() { zoom.value = 1; panX.value = 0; panY.value = 0 }

function onPanStart(e) {
  if (nodeDrag.isDraggingNode.value) return
  if (e.target.closest('.map-node') || e.target.closest('.edit-overlay')) return
  isPanning.value = true
  lastMouse.x = e.clientX
  lastMouse.y = e.clientY
  lastPan.x = panX.value
  lastPan.y = panY.value
}

function onPanMove(e) {
  if (!isPanning.value) return
  panX.value = lastPan.x + (e.clientX - lastMouse.x)
  panY.value = lastPan.y + (e.clientY - lastMouse.y)
}

function onPanEnd() { isPanning.value = false }

// Node drag
const nodeDrag = useNodeDrag(mindmap, zoom)

function getLiveX(pos) {
  if (nodeDrag.draggingNodeId.value === pos.id) {
    return nodeDrag.getDraggedPosition(pos.id, pos.x, pos.y).x
  }
  return null
}

function getLiveY(pos) {
  if (nodeDrag.draggingNodeId.value === pos.id) {
    return nodeDrag.getDraggedPosition(pos.id, pos.x, pos.y).y
  }
  return null
}

// Live connections
const liveConnections = computed(() => {
  const positions = layoutData.value.positions
  if (!positions.length) return []

  const posMap = new Map()
  for (const pos of positions) {
    const lx = getLiveX(pos)
    const ly = getLiveY(pos)
    posMap.set(pos.id, { ...pos, x: lx != null ? lx : pos.x, y: ly != null ? ly : pos.y })
  }

  const connections = []

  function buildConns(node) {
    if (node.collapsed || !node.children?.length) return
    const pp = posMap.get(node.id)
    if (!pp) return

    for (const child of node.children) {
      const cp = posMap.get(child.id)
      if (!cp) continue

      let sx, sy, ex, ey
      const childCenterX = cp.x + cp.w / 2
      const parentCenterX = pp.x + pp.w / 2

      if (childCenterX >= parentCenterX) {
        sx = pp.x + pp.w; sy = pp.y + pp.h / 2
        ex = cp.x;        ey = cp.y + cp.h / 2
      } else {
        sx = pp.x;          sy = pp.y + pp.h / 2
        ex = cp.x + cp.w;   ey = cp.y + cp.h / 2
      }

      const dist = Math.abs(ex - sx)
      const dx = Math.min(dist * 0.45, 80)
      const isRight = ex > sx
      const cp1x = isRight ? sx + dx : sx - dx
      const cp2x = isRight ? ex - dx : ex + dx

      connections.push({
        id: `${node.id}__${child.id}`,
        path: `M ${sx} ${sy} C ${cp1x} ${sy}, ${cp2x} ${ey}, ${ex} ${ey}`,
        color: child.color || '#999'
      })

      buildConns(child)
    }
  }

  const root = mindmap?.rootNode?.value
  if (root) buildConns(root)
  return connections
})

// DnD
const dragOverId = ref(null)
function onNodeDrop(targetId) { mindmap?.drag.dropOn(targetId); dragOverId.value = null }

// Edit
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

function cancelEdit() { editingId.value = null }

// CRUD
function handleAddChild(parentId) {
  const newId = mindmap?.addChild(parentId)
  if (newId) nextTick(() => startEdit(newId))
}

function handleDelete(nodeId) {
  const pos = layoutData.value.positions.find(p => p.id === nodeId)
  mindmap?.deleteNode(nodeId)
  if (pos) notify(`Узел «${pos.node.text}» удалён`, 'error', 'mdi-delete')
}

function handleResetNodePosition(nodeId) {
  mindmap?.updateNodePosition(nodeId, null, null)
  notify('Позиция сброшена', 'info', 'mdi-pin-off')
}

function handleAutoLayout() {
  mindmap?.resetAllPositions()
  notify('Авто-раскладка применена', 'success', 'mdi-auto-fix')
}

function handleSetImage(nodeId, dataUrl) {
  mindmap?.setNodeImage(nodeId, dataUrl)
  notify('Картинка добавлена', 'success', 'mdi-image')
}

function handleRemoveImage(nodeId) {
  mindmap?.removeNodeImage(nodeId)
  notify('Картинка удалена', 'info', 'mdi-image-off')
}

// ★ Notes panel
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

.conn-line:hover { opacity: 1; stroke-width: 3.5; }

.zoom-controls {
  position: absolute;
  bottom: 20px; right: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 10;
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