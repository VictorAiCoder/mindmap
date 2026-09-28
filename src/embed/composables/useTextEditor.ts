// embed/composables/useTextEditor.ts
import { ref, nextTick, type Ref, type ComputedRef } from 'vue'
import type { MindMapApi, NotifyFn } from '../types/mindmap-api'
import { readApiRef } from '../lib/readApiRef'
import type { LayoutPosition } from '@features/layout'
import type { MindMapNode } from '@entities/node'

// ─── Emit types ────────────────────────────────────────

interface TextEditorEmits {
  'child-added': [payload: { parentId: string; nodeId: string; nodeText: string }]
}

type EmitFn = <K extends keyof TextEditorEmits>(
  event: K,
  ...args: TextEditorEmits[K]
) => void

// ─── Options ───────────────────────────────────────────

export interface UseTextEditorOptions {
  mindmap: MindMapApi
  posById: ComputedRef<Map<string, LayoutPosition>>
  emit: EmitFn
}

// ─── Composable ────────────────────────────────────────

/**
 * Inline-редактор текста узла.
 *
 * Вынесен из MindMapCanvas.vue (Фаза 4 рефакторинга).
 * Управляет состоянием: idle → active → idle.
 *
 * @example
 * ```ts
 * const { editingId, editText, editFieldRef, startEdit, finishEdit, cancelEdit } =
 *   useTextEditor({ mindmap, posById, emit })
 * ```
 */
export function useTextEditor(opts: UseTextEditorOptions) {
  const { mindmap, posById, emit } = opts

  const editingId = ref<string | null>(null)
  const editText = ref<string>('')
  const editFieldRef = ref<{ focus: () => void } | null>(null)

  function findParentId(targetId: string): string | null {
    function walk(node: MindMapNode): string | null {
      for (const child of node.children) {
        if (child.id === targetId) return node.id
        const found = walk(child)
        if (found) return found
      }
      return null
    }
    return walk(readApiRef<MindMapNode>(mindmap.rootNode) as MindMapNode)
  }

  function startEdit(nodeId: string): void {
    const pos = posById.value.get(nodeId)
    if (!pos) return
    editingId.value = nodeId
    editText.value = pos.node.text
    nextTick(() => editFieldRef.value?.focus())
  }

  function finishEdit(): void {
    if (!editingId.value) return
    const trimmed = editText.value.trim()
    if (trimmed) {
      mindmap.updateText(editingId.value, trimmed)
      const parentId = findParentId(editingId.value)
      if (parentId) {
        emit('child-added', {
          parentId,
          nodeId: editingId.value,
          nodeText: trimmed,
        })
      }
    }
    editingId.value = null
  }

  function cancelEdit(): void {
    editingId.value = null
  }

  return {
    editingId,
    editText,
    editFieldRef,
    startEdit,
    finishEdit,
    cancelEdit,
  }
}
