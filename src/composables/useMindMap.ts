// src/composables/useMindMap.ts
import { ref, computed, type Ref, type WritableComputedRef } from 'vue'
import { useHistory } from './useHistory'
import { useTreeOperations } from './tree/useTreeOperations'
import { useImageStorage } from './image/useImageStorage'
import { useDragDrop } from './drag/useDragDrop'
import { usePersistence, loadFromStorage } from './persistence/usePersistence'
import { createDefaultDocument } from './tree/useNodeFactory'
import { countNodes, getDepth } from './tree/useTreeTraversal'

import type { MindMapNode, MindMapDocument, StoredImage } from '@/types/mindmap'
import type { MindMapApi } from '@/types/mindmap-api'

export function useMindMap(): MindMapApi {
  // Единый источник истины — документ целиком
  const document: Ref<MindMapDocument> = ref(
    loadFromStorage() ?? createDefaultDocument()
  )

  // Writable computed для компонентов, которые читают/пишут корневой узел.
  // MindMapApi.rootNode типизирован как Ref<MindMapNode>, но
  // WritableComputedRef структурно совместим (имеет .value getter/setter).
  const rootNode: WritableComputedRef<MindMapNode> = computed({
    get: () => document.value.root,
    set: (v) => { document.value.root = v },
  })

  // Writable computed для пула картинок (аналогично).
  const images: WritableComputedRef<StoredImage[]> = computed({
    get: () => document.value.images,
    set: (v) => { document.value.images = v },
  })

  // История снапшотит весь документ — дерево и пул картинок
  // откатываются синхронно.
  const history = useHistory(document)

  // ⚠️ В useTreeOperations передаём document, а не rootNode:
  //    там нужен triggerRef, который работает только с "настоящими" ref.
  const tree = useTreeOperations(document, history)
  const imageStorage = useImageStorage(images, rootNode)
  const drag = useDragDrop(rootNode, history)
  const persistence = usePersistence(document, imageStorage)

  const nodeCount = computed(() => countNodes(rootNode.value))
  const treeDepth = computed(() => getDepth(rootNode.value))

  function resetToDefault(): void {
    document.value = createDefaultDocument()
    history.clear()
  }

  async function importTree(file: File): Promise<MindMapDocument> {
    const imported = await persistence.importTree(file)
    history.clear()
    return imported
  }

  return {
    rootNode,
    imageStorage,

    ...tree,

    drag,

    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    exportTree: persistence.exportTree,
    importTree,

    resetToDefault,
    nodeCount,
    treeDepth,
  }
}