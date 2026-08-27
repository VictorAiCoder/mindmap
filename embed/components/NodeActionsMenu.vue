<!-- embed/components/NodeActionsMenu.vue -->
<template>
  <Teleport to="body">
    <Transition name="menu-pop" @after-leave="onAfterLeave">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="node-actions-menu"
        :style="menuPosition"
        @mousedown.stop.prevent
        @click.stop
      >
        <button class="menu-item" @click="act('onAddChild')">
          <v-icon icon="mdi-plus-circle-outline" size="16" />
          <span>Добавить потомка</span>
        </button>

        <button class="menu-item" @click="onImportMarkdownClick">
          <v-icon icon="mdi-language-markdown-outline" size="16" />
          <span>Импорт Markdown…</span>
        </button>

        <div class="menu-divider" />

        <div class="menu-scale" @mousedown.stop>
          <div class="menu-scale__header">
            <v-icon icon="mdi-resize" size="16" class="menu-scale__icon" />
            <span class="menu-scale__label">Масштаб</span>
            <span class="menu-scale__value" :class="{ 'menu-scale__value--modified': !isDefaultScale }">
              {{ scalePercent }}%
            </span>
            <button
              v-if="!isDefaultScale"
              class="menu-scale__reset"
              title="Сбросить на 100%"
              @click.stop="resetScale"
            >
              <v-icon icon="mdi-refresh" size="12" />
            </button>
          </div>
          <input
            type="range"
            class="menu-scale__slider"
            :min="SCALE_MIN"
            :max="SCALE_MAX"
            :step="SCALE_STEP"
            :value="liveScale"
            @pointerdown="onSliderStart"
            @input="onSliderInput"
            @pointerup="onSliderCommit"
            @pointercancel="onSliderCommit"
          />
          <div class="menu-scale__ticks">
            <span>75%</span>
            <span class="menu-scale__tick-center">100%</span>
            <span>250%</span>
          </div>
        </div>

        <button class="menu-item" @click="act('onEdit')">
          <v-icon icon="mdi-pencil-outline" size="16" />
          <span>Переименовать</span>
        </button>

        <div class="menu-divider" />

        <button v-if="!p.hasImage" class="menu-item" @click="act('onAddImage')">
          <v-icon icon="mdi-image-plus" size="16" />
          <span>Добавить картинку</span>
        </button>
        <button v-else class="menu-item" @click="act('onEditSegments')">
          <v-icon icon="mdi-crop" size="16" />
          <span>Редактор сегментов</span>
        </button>

        <button class="menu-item" @click="act('onOpenNotes')">
          <v-icon
            :icon="p.hasNotes ? 'mdi-text-box-edit-outline' : 'mdi-text-box-plus-outline'"
            size="16"
          />
          <span>{{ p.hasNotes ? 'Редактор заметки' : 'Добавить заметку' }}</span>
        </button>

        <template v-if="p.pinned || !p.isRoot">
          <div class="menu-divider" />

          <button v-if="p.pinned" class="menu-item menu-item--warn" @click="act('onResetPosition')">
            <v-icon icon="mdi-pin-off-outline" size="16" />
            <span>Сбросить позицию</span>
          </button>

          <button v-if="!p.isRoot" class="menu-item menu-item--danger" @click="act('onDelete')">
            <v-icon icon="mdi-delete-outline" size="16" />
            <span>Удалить</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, inject, type InjectionKey } from 'vue'
import { useNodeMenu, type NodeMenuHandlers } from '../composables/useNodeMenu'
import { mindMapKey } from '../injection-keys'
import { NODE_SCALE } from '@/entities/node'
import type { Center2D } from '@entities/node'

function injectStrict<T>(key: InjectionKey<T>): T {
  const value = inject(key)
  if (value === undefined) throw new Error(`Missing provide for injection key: ${String(key)}`)
  return value
}

const {
  isOpen,
  activeMenuId,
  activeNodeProps: p,
  menuPosition,
  runAction,
  registerMenuEl,
  closeMenu,
  openImportDialog,
} = useNodeMenu()
const mindmap = injectStrict(mindMapKey)

const menuRef = ref<HTMLElement | null>(null)

watch(menuRef, (el) => {
  registerMenuEl(el)
}, { flush: 'post' })

function act(action: keyof NodeMenuHandlers) {
  runAction(action)
}

function onImportMarkdownClick() {
  const nodeId = activeMenuId.value
  if (!nodeId) return
  closeMenu()
  openImportDialog(nodeId)
}

function onAfterLeave() {
  registerMenuEl(null)
  // Сбрасываем локальный state слайдера при закрытии меню
  dragSession.value = null
}

// ═══════════════════════════════════════════════════════════════
// ★ Управление масштабом узла
// ═══════════════════════════════════════════════════════════════

const SCALE_MIN = NODE_SCALE.MIN
const SCALE_MAX = NODE_SCALE.MAX
const SCALE_STEP = NODE_SCALE.STEP

/**
 * Сессия drag'а слайдера. Запоминаем "центр" узла в момент начала,
 * чтобы при изменении scale узел визуально оставался на месте
 * (актуально только для закреплённых узлов).
 */
interface DragSession {
  nodeId: string
  liveValue: number
  savedCenter: Center2D | null
}

const dragSession = ref<DragSession | null>(null)

/**
 * Вычисляет центр активного узла, если он закреплён.
 * Использует w/h из activeNodeProps (снимок LayoutPosition на момент открытия меню).
 *
 * Возвращает null, если узел не закреплён (тогда keepCenter не нужен —
 * узел позиционируется layout-алгоритмом).
 */
function computeCenterForActiveNode(): Center2D | null {
  const nodeId = activeMenuId.value
  if (!nodeId) return null

  const node = mindmap.findNode(nodeId)
  if (!node) return null

  if (node.customX == null || node.customY == null) return null

  const { w, h } = p  // activeNodeProps
  if (w <= 0 || h <= 0) return null

  return {
    cx: node.customX + w / 2,
    cy: node.customY + h / 2
  }
}

const liveScale = computed<number>(() => {
  if (dragSession.value) return dragSession.value.liveValue

  const nodeId = activeMenuId.value
  if (!nodeId) return NODE_SCALE.DEFAULT

  const node = mindmap.findNode(nodeId)
  return node?.scale ?? NODE_SCALE.DEFAULT
})

const scalePercent = computed<number>(() => Math.round(liveScale.value * 100))
const isDefaultScale = computed<boolean>(
  () => Math.abs(liveScale.value - NODE_SCALE.DEFAULT) < 0.001
)

function onSliderStart(_e: PointerEvent): void {
  const nodeId = activeMenuId.value
  if (!nodeId) return

  const node = mindmap.findNode(nodeId)
  if (!node) return

  dragSession.value = {
    nodeId,
    liveValue: node.scale ?? NODE_SCALE.DEFAULT,
    savedCenter: computeCenterForActiveNode()
  }
}

function onSliderInput(e: Event): void {
  const session = dragSession.value
  if (!session) return

  const target = e.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (!Number.isFinite(value)) return

  session.liveValue = value
  mindmap.updateScale(session.nodeId, value, session.savedCenter ?? undefined)
}

function onSliderCommit(): void {
  const session = dragSession.value
  if (!session) return

  mindmap.commitScale(
    session.nodeId,
    session.liveValue,
    session.savedCenter ?? undefined
  )

  dragSession.value = null
}

function resetScale(): void {
  const nodeId = activeMenuId.value
  if (!nodeId) return

  mindmap.commitScale(
    nodeId,
    NODE_SCALE.DEFAULT,
    computeCenterForActiveNode() ?? undefined
  )
}
</script>

<style scoped>
.node-actions-menu {
  min-width: 240px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 6px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(12px);
  user-select: none;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.85);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
  white-space: nowrap;
}

.menu-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
}

.menu-item--warn { color: #F57C00; }
.menu-item--warn:hover { background: rgba(255, 152, 0, 0.08); color: #E65100; }

.menu-item--danger { color: #E53935; }
.menu-item--danger:hover { background: rgba(244, 67, 54, 0.08); color: #C62828; }

.menu-divider {
  height: 1px;
  margin: 4px 8px;
  background: rgba(0, 0, 0, 0.06);
}

/* ═══════════════════════════════════════════════════════════════
   Секция масштаба
   ═══════════════════════════════════════════════════════════════ */
.menu-scale {
  padding: 8px 12px 10px;
}

.menu-scale__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: rgba(var(--v-theme-on-surface), 0.85);
  font-size: 13px;
  font-weight: 500;
}

.menu-scale__icon {
  opacity: 0.7;
}

.menu-scale__label {
  flex: 1;
}

.menu-scale__value {
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  min-width: 38px;
  text-align: right;
  transition: color 0.15s ease;
}

.menu-scale__value--modified {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.menu-scale__reset {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  transition: all 0.15s ease;
}

.menu-scale__reset:hover {
  background: rgb(var(--v-theme-primary));
  color: white;
  transform: rotate(90deg);
}

/* ── Slider ── */
.menu-scale__slider {
  width: 100%;
  height: 20px;
  background: transparent;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
  padding: 0;
}

/* Track — WebKit */
.menu-scale__slider::-webkit-slider-runnable-track {
  height: 4px;
  background: linear-gradient(
    to right,
    rgba(var(--v-theme-primary), 0.15) 0%,
    rgba(var(--v-theme-primary), 0.15) 50%,
    rgba(var(--v-theme-primary), 0.15) 100%
  );
  border-radius: 2px;
}

/* Thumb — WebKit */
.menu-scale__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  margin-top: -5px;
  background: rgb(var(--v-theme-primary));
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  cursor: grab;
  transition: transform 0.1s ease, box-shadow 0.15s ease;
}

.menu-scale__slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.4);
}

.menu-scale__slider:active::-webkit-slider-thumb {
  cursor: grabbing;
  transform: scale(1.3);
}

/* Track — Firefox */
.menu-scale__slider::-moz-range-track {
  height: 4px;
  background: rgba(var(--v-theme-primary), 0.15);
  border-radius: 2px;
}

.menu-scale__slider::-moz-range-progress {
  height: 4px;
  background: rgb(var(--v-theme-primary));
  border-radius: 2px;
}

.menu-scale__slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: rgb(var(--v-theme-primary));
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  cursor: grab;
  transition: transform 0.1s ease;
}

.menu-scale__slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}

.menu-scale__slider:focus {
  outline: none;
}

/* ── Tick marks ── */
.menu-scale__ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-variant-numeric: tabular-nums;
}

.menu-scale__tick-center {
  /* Маркер для 100% в центре шкалы */
  position: relative;
}

/* ═══════════════════════════════════════════════════════════════
   Анимации
   ═══════════════════════════════════════════════════════════════ */
.menu-pop-enter-active {
  transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.menu-pop-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.menu-pop-enter-from {
  opacity: 0;
  transform: scale(0.92) translateY(-4px);
}
.menu-pop-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
