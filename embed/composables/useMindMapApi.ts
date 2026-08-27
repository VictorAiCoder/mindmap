import { ref, computed, type Ref, type WritableComputedRef } from 'vue'
import { useHistory } from './useHistory'
import { useTreeOperations } from './useTreeOperations'
import { useImageStorage } from './useImageStorage'
import { useSegmentOperations } from './useSegmentOperations'
import { usePersistence } from './usePersistence'
import { createDefaultDocument, countNodes, getDepth } from '@entities/mindmap'
import type { MindMapNode } from '@entities/node'
import type { StoredImage } from '@entities/image'
import type { MindMapDocument } from '@entities/mindmap'
import type { MindMapApi } from '../types/mindmap-api'
import type { ExportFormat } from '../types/persistence'

export function useMindMapApi(
  initial: MindMapDocument | null,
  options?: { persistence?: boolean }
): MindMapApi {
  const document: Ref<MindMapDocument> = ref(
    initial?.root ? initial : createDefaultDocument()
  )

  const rootNode: WritableComputedRef<MindMapNode> = computed({
    get: () => document.value.root,
    set: (v) => { document.value.root = v },
  })

  const images: WritableComputedRef<StoredImage[]> = computed({
    get: () => document.value.images,
    set: (v) => { document.value.images = v },
  })

  const history = useHistory(document)
  const tree = useTreeOperations(document, history)
  const imageStorage = useImageStorage(images)
  const segmentOps = useSegmentOperations(document, history, imageStorage)

  const unusedImageCount = computed(() => {
    const root = rootNode.value
    if (!root) return imageStorage.totalCount.value
    const usedIds = new Set<string>()
    const stack: MindMapNode[] = [root]
    while (stack.length) {
      const n = stack.pop()!
      if (n.imageId) usedIds.add(n.imageId)
      if (n.children) stack.push(...n.children)
    }
    return imageStorage.images.value.filter((img) => !usedIds.has(img.id)).length
  })

  const nodeCount = computed(() => countNodes(rootNode.value))
  const treeDepth = computed(() => getDepth(rootNode.value))

  function resetToDefault(): void {
    document.value = createDefaultDocument()
    history.clear()
  }

  // Persistence is optional — consumer controls when to use it
  const persistence = options?.persistence ? usePersistence(document, imageStorage) : null

  function exportTree(format?: ExportFormat): string {
    if (!persistence) throw new Error('Persistence not enabled')
    return persistence.exportTree(format)
  }

  async function importTree(file: File): Promise<MindMapDocument> {
    if (!persistence) throw new Error('Persistence not enabled')
    const imported = await persistence.importTree(file)
    history.clear()
    return imported
  }

  return {
    rootNode,
    imageStorage,
    unusedImageCount,
    ...tree,
    ...segmentOps,

    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    exportTree,
    importTree,

    resetToDefault,
    nodeCount,
    treeDepth,
  }
}
