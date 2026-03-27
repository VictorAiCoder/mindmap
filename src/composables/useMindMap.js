// src/composables/useMindMap.js
import { ref } from 'vue'
import { useHistory } from './useHistory'
import { useTreeOperations } from './useTreeOperations'
import { useDragDrop } from './useDragDrop'
import { usePersistence, loadFromStorage } from './usePersistence'
import { createDefaultTree } from './useNodeFactory'
import { countNodes, getDepth } from './useTreeTraversal'

export function useMindMap() {
  const rootNode = ref(loadFromStorage() || createDefaultTree())

  const history = useHistory(rootNode)
  const tree = useTreeOperations(rootNode, history)
  const drag = useDragDrop(rootNode, history)
  const persistence = usePersistence(rootNode)

  function resetToDefault() {
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