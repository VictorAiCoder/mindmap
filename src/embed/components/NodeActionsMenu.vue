<!-- embed/components/NodeActionsMenu.vue -->
<template>
  <Teleport to="body">
    <Transition name="menu-pop" @after-leave="onAfterLeave">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="node-actions-menu"
        role="menu"
        aria-orientation="vertical"
        :style="menuPosition"
        tabindex="-1"
        @keydown.esc="closeMenu"
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
import { ref, watch, onMounted } from 'vue'
import { useNodeMenu, type NodeMenuHandlers } from '../composables/useNodeMenu'
import { useScaleSlider } from '../composables/useScaleSlider'
import { NODE_SCALE } from '@entities/node'
import { mindMapKey } from '../injection-keys'
import { injectStrict } from '@shared/lib/injectStrict'

const SCALE_MIN = NODE_SCALE.MIN
const SCALE_MAX = NODE_SCALE.MAX
const SCALE_STEP = NODE_SCALE.STEP

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

onMounted(() => {
  menuRef.value?.focus()
})

// ─── Scale slider ────────────────────────────

const {
  liveScale,
  scalePercent,
  isDefaultScale,
  onSliderStart,
  onSliderInput,
  onSliderCommit,
  resetScale,
  cleanup: cleanupScale,
} = useScaleSlider({
  activeMenuId,
  isOpen,
  findNode: mindmap.findNode,
  activeNodeProps: p,
  updateScale: mindmap.updateScale,
  commitScale: mindmap.commitScale,
})

// ─── Actions ─────────────────────────────────

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
  cleanupScale()
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
