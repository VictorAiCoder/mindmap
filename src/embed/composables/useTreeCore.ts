import { triggerRef, type Ref } from 'vue'
import { findNodeById } from '@entities/mindmap'
import type { MindMapNode } from '@entities/node'
import type { MindMapDocument } from '@entities/mindmap'

export interface TreeCore {
  rootRef: () => MindMapNode
  imagesRef: () => import('@entities/image').StoredImage[]
  findNode: (id: string) => MindMapNode | null
  touch: () => void
}

export function useTreeCore(document: Ref<MindMapDocument>): TreeCore {
  const rootRef = () => document.value.root
  const imagesRef = () => document.value.images

  function touch(): void {
    triggerRef(document)
  }

  function findNode(id: string): MindMapNode | null {
    return findNodeById(rootRef(), id)
  }

  return { rootRef, imagesRef, findNode, touch }
}