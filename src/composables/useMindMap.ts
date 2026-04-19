// src/composables/useMindMap.ts
import { ref, type Ref } from 'vue'
import { useHistory } from './useHistory'
import { useTreeOperations } from './tree/useTreeOperations'
import { useDragDrop } from './drag/useDragDrop'
import { usePersistence, loadFromStorage } from './persistence/usePersistence'
import { createDefaultTree } from './tree/useNodeFactory'
import { countNodes, getDepth } from './tree/useTreeTraversal'

import type { MindMapNode } from '@/types/mindmap'
import type { MindMapApi } from '@/types/mindmap-api'

export function useMindMap(): MindMapApi {
  const rootNode: Ref<MindMapNode> = ref(
    loadFromStorage() ?? createDefaultTree()
  )

  const history = useHistory(rootNode)
  const tree = useTreeOperations(rootNode, history)
  const drag = useDragDrop(rootNode, history)
  const persistence = usePersistence(rootNode)

  function resetToDefault(): void {
    history.save()
    rootNode.value = createDefaultTree()
  }

  return {
    rootNode,
    ...tree,
    drag,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    exportTree: persistence.exportTree,
    importTree: persistence.importTree,
    resetToDefault,
    countNodes: () => countNodes(rootNode.value),
    getDepth: () => getDepth(rootNode.value)
  }
}