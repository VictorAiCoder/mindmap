<!-- embed/components/EmbedNodeMenu.vue — default read-only context menu -->
<template>
  <Teleport to="body">
    <Transition name="menu-pop" @after-leave="emit('after-leave')">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="embed-node-menu"
        :style="menuStyle"
        @mousedown.stop.prevent
        @click.stop
      >
        <button class="embed-node-menu__item" @click="onCopyText">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span>Копировать текст</span>
        </button>

        <button
          v-if="hasChildren"
          class="embed-node-menu__item"
          @click="emit('toggle-collapse')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline :points="isCollapsed ? '6 9 12 15 18 9' : '18 15 12 9 6 15'"/>
          </svg>
          <span>{{ isCollapsed ? 'Развернуть' : 'Свернуть' }}</span>
        </button>

        <button
          v-if="hasNotes"
          class="embed-node-menu__item"
          @click="emit('toggle-notes')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span>Заметка</span>
        </button>

        <div class="embed-node-menu__divider" />

        <div class="embed-node-menu__info">
          <span>Глубина: {{ depth }}</span>
          <span v-if="childCount > 0">Детей: {{ childCount }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, type CSSProperties } from 'vue'
import type { MindMapNode } from '@entities/node'

interface Props {
  node: MindMapNode
  depth: number
  isOpen: boolean
  triggerEl: HTMLElement | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'toggle-collapse': []
  'toggle-notes': []
  'after-leave': []
}>()

const menuRef = ref<HTMLElement | null>(null)

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)
const childCount = computed(() => props.node.children?.length ?? 0)
const isCollapsed = computed(() => !!props.node.collapsed)
const hasNotes = computed(() => !!props.node.notes?.trim())

// ─── Position ─────────────────────────────────

const menuStyle = computed<CSSProperties>(() => {
  if (!props.triggerEl) return { visibility: 'hidden' }

  const btn = props.triggerEl.getBoundingClientRect()
  const pad = 8

  let left = btn.right + 6
  let top = btn.top - 4

  // Flip horizontally if overflowing
  if (left + 220 > window.innerWidth) {
    left = btn.left - 226
  }
  // Flip vertically if overflowing
  if (top + 150 > window.innerHeight) {
    top = window.innerHeight - 150 - pad
  }
  if (top < pad) top = pad

  return {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    zIndex: 9999,
  }
})

// ─── Actions ──────────────────────────────────

function onCopyText(): void {
  navigator.clipboard?.writeText(props.node.text)
  emit('close')
}

// ─── Outside click ────────────────────────────

let cleanupFn: (() => void) | null = null

function setupOutsideListeners(): void {
  const onMouseDown = (e: MouseEvent) => {
    const target = e.target as Node
    if (props.triggerEl?.contains(target)) {
      emit('close')
      return
    }
    if (menuRef.value?.contains(target)) return
    emit('close')
  }
  const onEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') emit('close')
  }

  document.addEventListener('mousedown', onMouseDown, true)
  document.addEventListener('keydown', onEscape, true)

  cleanupFn = () => {
    document.removeEventListener('mousedown', onMouseDown, true)
    document.removeEventListener('keydown', onEscape, true)
  }
}

watch(() => props.isOpen, (open) => {
  if (open) {
    setupOutsideListeners()
  } else {
    cleanupFn?.()
    cleanupFn = null
  }
})

onBeforeUnmount(() => {
  cleanupFn?.()
  cleanupFn = null
})
</script>

<style scoped>
.embed-node-menu {
  min-width: 200px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 6px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.2);
  user-select: none;
}

.embed-node-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #c8c8c8;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
  white-space: nowrap;
}

.embed-node-menu__item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.7;
}

.embed-node-menu__item:hover {
  background: rgba(39, 185, 75, 0.1);
  color: #27b94b;
}

.embed-node-menu__divider {
  height: 1px;
  margin: 4px 8px;
  background: #333;
}

.embed-node-menu__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 12px;
  font-size: 11px;
  color: #666;
}

/* Animation */
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
