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

  /**
   * Сбрасывает карту к дефолтной. Сохраняет текущее состояние в undo-стек —
   * пользователь может откатить случайный сброс.
   */
  function resetToDefault(): void {
    history.save()
    rootNode.value = createDefaultTree()
  }

  /**
   * Импортирует карту из файла. После успешного импорта
   * очищает историю — старые снапшоты относятся к другой карте.
   */
  async function importTree(file: File): Promise<MindMapNode> {
    const data = await persistence.importTree(file)
    history.clear()
    return data
  }

  return {
    rootNode,
    ...tree,
    drag,

    // History
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    // Persistence (importTree переопределён, exportTree прокидываем)
    exportTree: persistence.exportTree,
    importTree,

    // Misc
    resetToDefault,
    countNodes: () => countNodes(rootNode.value),
    getDepth: () => getDepth(rootNode.value)
  }
}