// src/composables/useMindMap.ts
import { ref, computed, type Ref } from 'vue'
import { useHistory } from './useHistory'
import { useTreeOperations } from './tree/useTreeOperations'
import { useDragDrop } from './drag/useDragDrop'
import { usePersistence, loadFromStorage } from './persistence/usePersistence'
import { createDefaultTree } from './tree/useNodeFactory'
import { countNodes, getDepth } from './tree/useTreeTraversal'

import type { MindMapNode } from '@/types/mindmap'
import type { MindMapApi } from '@/types/mindmap-api'

/**
 * Корневой composable приложения. Склеивает:
 *   - состояние (rootNode)
 *   - history (undo/redo)
 *   - tree operations (CRUD, layout)
 *   - drag&drop (ui-state для списков)
 *   - persistence (localStorage + import/export)
 *
 * Возвращает единый фасад MindMapApi — его провайдят в App.vue
 * через provide/inject.
 */
export function useMindMap(): MindMapApi {
  const rootNode: Ref<MindMapNode> = ref(
    loadFromStorage() ?? createDefaultTree()
  )

  const history = useHistory(rootNode)
  const tree = useTreeOperations(rootNode, history)
  const drag = useDragDrop(rootNode, history)
  const persistence = usePersistence(rootNode)

  // ⭐ Статистика дерева как computed — кешируется и реактивна
  const nodeCount = computed(() => countNodes(rootNode.value))
  const treeDepth = computed(() => getDepth(rootNode.value))

  function resetToDefault(): void {
    rootNode.value = createDefaultTree()
    history.clear()
  }

  async function importTree(file: File): Promise<MindMapNode> {
    const imported = await persistence.importTree(file)
    history.clear()
    return imported
  }

  return {
    rootNode,

    // Tree operations
    ...tree,

    // Drag & drop
    drag,

    // History
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    // Persistence
    exportTree: persistence.exportTree,
    importTree,

    // Misc
    resetToDefault,
    nodeCount,    // было: countNodes: () => countNodes(rootNode.value)
    treeDepth     // было: getDepth: () => getDepth(rootNode.value)
  }
}