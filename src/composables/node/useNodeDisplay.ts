// src/composables/node/useNodeDisplay.ts
import { computed, type Ref, type ComputedRef } from 'vue'
import type { LayoutPosition } from '@/types/layout'
import type { MindMapNode } from '@entities/node'

/**
 * Общие производные значения для отображения узла.
 *
 * Централизует ровно те вычисления, которые реально дублируются
 * в ≥2 компонентах (MapNode, NodeContent, NodeNotesPreview).
 *
 * Одноразовые производные (hasChildren, childCount, notes, notesVisible,
 * notesPinned) намеренно оставлены inline в соответствующих компонентах —
 * чтобы не создавать ложную общность.
 */
export interface NodeDisplay {
  node:     ComputedRef<MindMapNode>   // ✅ заглавная M
  isRoot:   ComputedRef<boolean>
  isLeaf:   ComputedRef<boolean>
  hasNotes: ComputedRef<boolean>
  color:    ComputedRef<string>
  pinned:   ComputedRef<boolean>
}

const DEFAULT_NODE_COLOR = '#5C6BC0'

export function useNodeDisplay(pos: Ref<LayoutPosition>): NodeDisplay {
  const node = computed(() => pos.value.node)

  return {
    node,
    isRoot:   computed(() => pos.value.depth === 0),
    isLeaf:   computed(() => pos.value.depth >= 2),
    hasNotes: computed(() => !!node.value.notes?.trim()),
    color:    computed(() => node.value.color || DEFAULT_NODE_COLOR),
    pinned:   computed(() => pos.value.hasCustomPos),
  }
}