import { type Ref } from 'vue'
import type { MindMapNode } from '@entities/node'
import type { StoredImage } from '@entities/image'
import { parseMarkdownToTree } from '@features/persistence'
import type { TreeCore } from './useTreeCore'
import type { HistoryApi } from '../types/history'

export interface NodeMarkdownApi {
  importMarkdownIntoNode: (nodeId: string, markdown: string) => number
}

export function useNodeMarkdown(core: TreeCore, history: HistoryApi): NodeMarkdownApi {
  const { rootRef, imagesRef, findNode, touch } = core

  function countNodes(node: MindMapNode): number {
    let count = 1
    for (const child of node.children) {
      count += countNodes(child)
    }
    return count
  }

  function importMarkdownIntoNode(
    nodeId: string,
    markdown: string
  ): number {
    const target = findNode(nodeId)
    if (!target) {
      console.warn(`[importMarkdown] Узел ${nodeId} не найден`)
      return 0
    }

    history.save()

    const images = imagesRef()
    const imagesWrapper: Ref<typeof images> = {
      get value() { return images },
      set value(v) {
        images.length = 0
        images.push(...v)
      }
    } as Ref<typeof images>

    const parsed = parseMarkdownToTree(markdown, imagesWrapper)
    if (!parsed) {
      console.warn('[importMarkdown] Markdown пуст или без заголовков')
      history.undo()
      return 0
    }

    target.text = parsed.text
    if (parsed.notes) target.notes = parsed.notes
    if (parsed.imageId) target.imageId = parsed.imageId

    for (const child of parsed.children) {
      target.children.push(child)
    }

    target.collapsed = false
    touch()

    return countNodes(parsed)
  }

  return { importMarkdownIntoNode }
}
