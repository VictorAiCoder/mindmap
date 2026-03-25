// src/composables/useMindMap.js
// Проверяем что возвращает useMindMap — rootNode должен быть ref

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

  // Возвращаем rootNode как ref — это важно
  return {
    rootNode,       // <-- ref
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