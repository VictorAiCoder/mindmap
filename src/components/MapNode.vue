<!-- src/components/MapNode.vue -->
<template>
  <div
    class="map-node"
    :class="{
      'map-node--root': isRoot,
      'map-node--leaf': isLeaf,
      'map-node--drag-over': isDraggedOver,
      'map-node--dragging': isBeingDragged,
      'map-node--custom': pos.hasCustomPos
    }"
    :style="nodeStyle"
    @dblclick.stop="$emit('edit')"
    @mousedown.stop="onMouseDown"
  >
    <div class="map-node__bg" :style="bgStyle" />

    <div class="map-node__content">
      <!-- Сворачивание -->
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

      <!-- Текст -->
      <span class="map-node__text">{{ pos.node.text }}</span>

      <!-- Бейдж свёрнутых -->
      <span v-if="pos.node.collapsed && hasChildren" class="map-node__badge">
        {{ pos.node.children.length }}
      </span>

      <!-- Индикатор кастомной позиции -->
      <v-icon
        v-if="pos.hasCustomPos"
        icon="mdi-pin"
        size="10"
        class="map-node__pin"
        color="grey"
      />
    </div>

    <!-- Кнопки действий -->
    <div class="map-node__actions" @mousedown.stop>
      <button class="map-node__action map-node__action--add" @click.stop="$emit('addChild')">
        <v-icon icon="mdi-plus" size="14" />
      </button>
      <button class="map-node__action map-node__action--edit" @click.stop="$emit('edit')">
        <v-icon icon="mdi-pencil" size="14" />
      </button>
      <!-- Сброс позиции -->
      <button
        v-if="pos.hasCustomPos"
        class="map-node__action map-node__action--reset"
        @click.stop="$emit('resetPosition')"
        title="Вернуть в авто-позицию"
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  pos: { type: Object, required: true },
  isDraggedOver: { type: Boolean, default: false },
  isBeingDragged: { type: Boolean, default: false },
  liveX: { type: Number, default: null },
  liveY: { type: Number, default: null }
})

const emit = defineEmits([
  'edit', 'addChild', 'delete', 'toggle',
  'resetPosition', 'startDrag'
])

const isRoot = computed(() => props.pos.depth === 0)
const isLeaf = computed(() => props.pos.depth >= 2)
const hasChildren = computed(() => props.pos.node.children?.length > 0)

// ★ Позиция: live (при перетаскивании) или из layout
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
  if (isRoot.value) {
    return { background: color, borderRadius: '25px' }
  }
  if (isLeaf.value) {
    return {
      background: 'transparent',
      borderBottom: `2.5px solid ${color}`,
      borderRadius: '0'
    }
  }
  return {
    background: color + '22',
    border: `2px solid ${color}`,
    borderRadius: '20px'
  }
})

function onMouseDown(e) {
  // Только левая кнопка, не на кнопках действий
  if (e.button !== 0) return
  emit('startDrag', e)
}
</script>

<style scoped>
.map-node {
  position: absolute;
  cursor: grab;
  user-select: none;
  transition: transform 0.15s ease, opacity 0.15s ease, left 0.2s ease, top 0.2s ease;
  z-index: 2;
}

.map-node:hover {
  z-index: 5;
}

.map-node--dragging {
  cursor: grabbing;
  opacity: 0.85;
  z-index: 100 !important;
  transition: none !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border-radius: 25px;
}

.map-node--drag-over .map-node__bg {
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.6) !important;
}

/* Индикатор что позиция кастомная */
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
}

.map-node__bg {
  position: absolute;
  inset: 0;
  transition: all 0.2s ease;
}

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
  max-width: 120px;
}

.map-node--root .map-node__text {
  font-size: 16px;
  font-weight: 700;
  color: white;
  max-width: 160px;
}

.map-node--leaf .map-node__text {
  font-size: 12px;
  font-weight: 400;
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

.map-node__pin {
  opacity: 0.4;
}

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
</style>