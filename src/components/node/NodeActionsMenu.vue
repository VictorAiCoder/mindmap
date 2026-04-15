<!-- src/components/node/NodeActionsMenu.vue -->
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
        <button v-if="!p.hasImage" class="menu-item" @click="act('addImage')">
          <v-icon icon="mdi-image-plus" size="16" />
          <span>Добавить картинку</span>
        </button>

        <button class="menu-item" @click="act('openNotes')">
          <v-icon
            :icon="p.hasNotes ? 'mdi-text-box-edit-outline' : 'mdi-text-box-plus-outline'"
            size="16"
          />
          <span>{{ p.hasNotes ? 'Редактировать заметку' : 'Добавить заметку' }}</span>
        </button>

        <div class="menu-divider" />

        <button class="menu-item" @click="act('addChild')">
          <v-icon icon="mdi-plus-circle-outline" size="16" />
          <span>Добавить потомка</span>
        </button>

        <button class="menu-item" @click="act('edit')">
          <v-icon icon="mdi-pencil-outline" size="16" />
          <span>Переименовать</span>
        </button>

        <template v-if="p.pinned || !p.isRoot">
          <div class="menu-divider" />

          <button v-if="p.pinned" class="menu-item menu-item--warn" @click="act('resetPosition')">
            <v-icon icon="mdi-pin-off-outline" size="16" />
            <span>Сбросить позицию</span>
          </button>

          <button v-if="!p.isRoot" class="menu-item menu-item--danger" @click="act('delete')">
            <v-icon icon="mdi-delete-outline" size="16" />
            <span>Удалить</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useNodeMenu } from '@/composables/useNodeMenu'

const { isOpen, activeNodeProps: p, menuPosition, emitAction, registerMenuEl } = useNodeMenu()

const menuRef = ref<HTMLElement | null>(null)

// ★ Каждый раз когда menuRef появляется/исчезает — регистрируем
watch(menuRef, (el) => {
  registerMenuEl(el)
}, { flush: 'post' })

function act(action: string) {
  emitAction(action)
}

function onAfterLeave() {
  registerMenuEl(null)
}
</script>

<style scoped>
.node-actions-menu {
  min-width: 200px;
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

.menu-pop-enter-active {
  transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.menu-pop-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.menu-pop-enter-from {
  opacity: 0;
  transform: scale(0.9) translateX(-8px);
}
.menu-pop-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>