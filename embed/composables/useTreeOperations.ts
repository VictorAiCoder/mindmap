import type { Ref } from 'vue'

import type { MindMapDocument } from '@entities/mindmap'
import type { HistoryApi } from '../types/history'
import type { TreeOperationsApi } from '../types/tree-operations'

import { useTreeCore } from './useTreeCore'
import { useTreeStructure } from './useTreeStructure'
import { useNodeImages } from './useNodeImages'
import { useNodeMarkdown } from './useNodeMarkdown'
import { useTreeLayout } from './useTreeLayout'

export function useTreeOperations(
  document: Ref<MindMapDocument>,
  history: HistoryApi
): TreeOperationsApi {
  const core = useTreeCore(document)
  const structure = useTreeStructure(core, history)
  const images = useNodeImages(core, history)
  const markdown = useNodeMarkdown(core, history)
  const layout = useTreeLayout(core, history)

  return {
    ...structure,
    ...images,
    ...markdown,
    ...layout,
  }
}
