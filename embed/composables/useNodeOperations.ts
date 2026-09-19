// embed/composables/useNodeOperations.ts
import type { ComputedRef } from 'vue'
import type { MindMapApi, NotifyFn } from '../types/mindmap-api'
import type { LayoutPosition } from '@features/layout'

// ─── Emit types (matches MindMapCanvas defineEmits) ─────

export interface NodeOperationsEmits {
  'node-deleted': [payload: { nodeId: string; nodeText: string }]
  'node-image-set': [payload: { nodeId: string; dataUrl: string }]
  'node-image-removed': [payload: { nodeId: string }]
  'pin-change': [payload: { nodeId: string; pinned: boolean }]
  'notes-visible-change': [payload: { nodeId: string; visible: boolean }]
}

type EmitFn = <K extends keyof NodeOperationsEmits>(
  event: K,
  ...args: NodeOperationsEmits[K]
) => void

// ─── Options ───────────────────────────────────────────

export interface UseNodeOperationsOptions {
  mindmap: MindMapApi
  notify: NotifyFn
  emit: EmitFn
  posById: ComputedRef<Map<string, LayoutPosition>>
}

// ─── Composable ────────────────────────────────────────

/**
 * CRUD-обработчики для узлов карты.
 *
 * Вынесен из MindMapCanvas.vue (Фаза 2 рефакторинга).
 * Каждый обработчик: API → notify → emit — три слоя.
 */
export function useNodeOperations(opts: UseNodeOperationsOptions) {
  const { mindmap, notify, emit, posById } = opts

  function handleDelete(nodeId: string) {
    const pos = posById.value.get(nodeId)
    const nodeText = pos?.node.text ?? ''
    mindmap.deleteNode(nodeId)
    if (pos) notify(`Узел «${nodeText}» удалён`, 'error', 'mdi-delete')
    emit('node-deleted', { nodeId, nodeText })
  }

  function handleResetPosition(nodeId: string) {
    mindmap.updateNodePosition(nodeId, null, null)
    notify('Позиция сброшена', 'info', 'mdi-pin-off')
  }

  function handleSetImage(nodeId: string, dataUrl: string) {
    mindmap.setNodeImage(nodeId, dataUrl)
    notify('Картинка добавлена', 'success', 'mdi-image')
    emit('node-image-set', { nodeId, dataUrl })
  }

  function handleSetImageById(nodeId: string, imageId: string) {
    mindmap.setNodeImageById(nodeId, imageId)
    notify('Картинка прикреплена', 'success', 'mdi-image-check')
  }

  function handleRemoveImage(nodeId: string) {
    mindmap.removeNodeImage(nodeId)
    notify('Картинка удалена', 'info', 'mdi-image-off')
    emit('node-image-removed', { nodeId })
  }

  function handleToggleNotePin(nodeId: string) {
    mindmap.toggleNotePin(nodeId)
    const node = mindmap.findNode(nodeId)
    if (node) {
      emit('pin-change', {
        nodeId,
        pinned: !!node.notesPinned
      })
    }
  }

  function handleToggleNotesVisible(nodeId: string) {
    mindmap.toggleNotesVisible(nodeId)
    const node = mindmap.findNode(nodeId)
    if (node) {
      emit('notes-visible-change', {
        nodeId,
        visible: node.notesVisible !== false
      })
    }
  }

  return {
    handleDelete,
    handleResetPosition,
    handleSetImage,
    handleSetImageById,
    handleRemoveImage,
    handleToggleNotePin,
    handleToggleNotesVisible,
  }
}