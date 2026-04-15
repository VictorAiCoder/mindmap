<!-- src/components/node/NodeActions.vue -->
<template>
  <div class="node-actions">
    <button
      ref="triggerRef"
      class="node-actions__trigger"
      :class="{ 'node-actions__trigger--open': isMine }"
      @mousedown.stop.prevent
      @click.stop="onTriggerClick"
    >
      <v-icon icon="mdi-dots-horizontal" size="16" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNodeMenu } from '@/composables/useNodeMenu'

const props = defineProps<{
  nodeId: string
  isRoot: boolean
  hasImage: boolean
  hasNotes: boolean
  pinned: boolean
}>()

const emit = defineEmits<{
  addImage: []
  openNotes: []
  addChild: []
  edit: []
  resetPosition: []
  delete: []
}>()

const { isOpen, activeMenuId, openMenu } = useNodeMenu()

const triggerRef = ref<HTMLElement | null>(null)
const isMine = computed(() => isOpen.value && activeMenuId.value === props.nodeId)

function onTriggerClick() {
  openMenu(
    props.nodeId,
    triggerRef.value!,
    {
      isRoot: props.isRoot,
      hasImage: props.hasImage,
      hasNotes: props.hasNotes,
      pinned: props.pinned
    },
    (action: string) => emit(action as any)
  )
}
</script>

<style scoped>
.node-actions {
  position: absolute;
  top: 50%;
  right: -14px;
  transform: translateY(-50%);
  z-index: 10;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}

.node-actions__trigger {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid rgba(0, 0, 0, 0.08);
  background: rgb(var(--v-theme-surface));
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
</style>