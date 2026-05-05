<!-- src/components/node/NodeActions.vue -->
<template>
  <div class="node-actions">
    <button
      ref="triggerRef"
      class="node-actions__trigger"
      :class="{ 'node-actions__trigger--open': active }"
      title="Действия"
      @click.stop="onTriggerClick"
      @mousedown.stop
    >
      <v-icon icon="mdi-dots-horizontal" class="node-actions__icon" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// ─── Props / Emits ──────────────────────────

interface Props {
  /** true, когда для этого узла сейчас открыто меню (подсветка триггера). */
  active: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  /**
   * Клик по кнопке. Отдаёт наружу triggerEl — родитель решает,
   * что с ним делать (например, открыть меню через useNodeMenu).
   *
   * Инверсия управления: компонент не знает про меню, только про факт клика.
   */
  click: [payload: { triggerEl: HTMLElement }]
}>()

// ─── Refs ───────────────────────────────────

const triggerRef = ref<HTMLElement | null>(null)

// ─── Handlers ───────────────────────────────

function onTriggerClick(): void {
  const el = triggerRef.value
  if (!el) return
  emit('click', { triggerEl: el })
}
</script>

<style scoped>
.node-actions {
  z-index: 10;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.node-actions__trigger {
  width: 1.757em;                               /* 26px */
  height: 1.757em;
  border-radius: 50%;
  border: 0.107em solid rgba(0, 0, 0, 0.08);    /* 1.5px */
  background: rgb(var(--v-theme-surface));
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0.143em 0.571em rgba(0, 0, 0, 0.1);  /* 2px 8px */
  transition: all 0.15s ease;
  pointer-events: auto;
}

.node-actions__trigger:hover,
.node-actions__trigger--open {
  background: rgb(var(--v-theme-primary));
  color: white;
  border-color: rgb(var(--v-theme-primary));
  transform: scale(1.1);
}

/* ★ Иконка mdi-dots-horizontal внутри кнопки — 16px при base 14px = 1.143em */
.node-actions__icon {
  font-size: 1.1em !important;   /* 16px */
}
</style>