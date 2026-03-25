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
      <!--
        Единый контейнер для SVG-линий и HTML-узлов.
        Трансформация применяется ОДИН РАЗ к общему родителю.
      -->
      <div class="canvas-scene" :style="sceneStyle">
        <!-- SVG — только линии, без viewBox, в пиксельных координатах -->
        <svg class="scene-svg">
          <!-- Сетка -->
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(0,0,0,0.06)"
                stroke-width="0.5"
              />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" />

          <!-- Соединительные кривые -->
          <path
            v-for="conn in layoutData.connections"
            :key="conn.id"
            :d="conn.path"
            :stroke="conn.color"
            stroke-width="2.5"
            fill="none"
            stroke-linecap="round"
            class="conn-line"
          />
        </svg>

        <!-- HTML-узлы — в тех же пиксельных координатах -->
        <MapNode
          v-for="pos in layoutData.positions"
          :key="pos.id"
          :pos="pos"
          :is-dragged-over="dragOverId === pos.id"
          @edit="startEdit(pos.id)"
          @add-child="handleAddChild(pos.id)"
          @delete="handleDelete(pos.id)"
          @toggle="mindmap.toggleCollapse(pos.id)"
          @drag-start="onNodeDragStart($event, pos.id)"
          @drag-end="onNodeDragEnd"
          @drag-over="dragOverId = pos.id"
          @drag-leave="dragOverId = null"
          @drop="onNodeDrop(pos.id)"
        />
      </div>
    </template>

    <!-- Fallback -->
    <div v-else class="d-flex align-center justify-center" style="height: 100%">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Редактирование узла -->
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

    <!-- Зум-контролы -->
    <div class="zoom-controls">
      <v-btn icon="mdi-plus" size="small" variant="tonal" @click="zoomIn" />
      <v-chip size="small" variant="tonal" class="my-1">{{ zoomPercent }}%</v-chip>
      <v-btn icon="mdi-minus" size="small" variant="tonal" @click="zoomOut" />
      <v-btn icon="mdi-fit-to-screen" size="small" variant="tonal" class="mt-1" @click="resetView" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, nextTick } from 'vue'
import MapNode from './MapNode.vue'
import { useLayout } from '../composables/useLayout'

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

// --- Pan & Zoom ---
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const lastMouse = { x: 0, y: 0 }
const lastPan = { x: 0, y: 0 }

const zoomPercent = computed(() => Math.round(zoom.value * 100))

/**
 * Единый стиль трансформации для всей сцены.
 * SVG и HTML-узлы двигаются вместе — координаты совпадают.
 */
const sceneStyle = computed(() => {
  const b = layoutData.value.bounds
  return {
    width: `${b.width}px`,
    height: `${b.height}px`,
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
    transformOrigin: '0 0',
    // Смещаем начало координат чтобы учесть padding (bounds.minX/minY)
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

function resetView() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

function onPanStart(e) {
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

// --- Drag & Drop ---
const dragOverId = ref(null)

function onNodeDragStart(e, nodeId) { mindmap?.drag.start(nodeId) }
function onNodeDragEnd() { mindmap?.drag.end(); dragOverId.value = null }
function onNodeDrop(targetId) { mindmap?.drag.dropOn(targetId); dragOverId.value = null }

// --- Редактирование ---
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

// --- Добавление / Удаление ---
function handleAddChild(parentId) {
  const newId = mindmap?.addChild(parentId)
  if (newId) nextTick(() => startEdit(newId))
}

function handleDelete(nodeId) {
  const pos = layoutData.value.positions.find(p => p.id === nodeId)
  mindmap?.deleteNode(nodeId)
  if (pos) notify(`Узел «${pos.node.text}» удалён`, 'error', 'mdi-delete')
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

.canvas-wrapper:active {
  cursor: grabbing;
}

/* Единая сцена — SVG и HTML в одних координатах */
.canvas-scene {
  position: absolute;
}

.scene-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.conn-line {
  opacity: 0.65;
  transition: opacity 0.2s;
}

.conn-line:hover {
  opacity: 1;
  stroke-width: 3.5;
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
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