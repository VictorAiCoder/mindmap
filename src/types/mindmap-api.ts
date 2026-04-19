// src/types/mindmap-api.ts
import type { Ref } from 'vue'
import type { MindMapNode, ScenePosition } from './mindmap'

export type LayoutType = 'mindmap' // ★ расширишь, если useAutoLayout знает другие

export interface TreeOperationsApi {
  addChild: (parentId: string, text?: string) => string | null
  deleteNode: (nodeId: string) => void

  updateText: (nodeId: string, text: string) => void
  updateColor: (nodeId: string, color: string) => void
  updateNotes: (nodeId: string, notes: string) => void
  updateNodePosition: (
    nodeId: string,
    x: number | null,
    y: number | null
  ) => void

  toggleCollapse: (nodeId: string) => void
  toggleNotePin: (nodeId: string) => void
  toggleNotesVisible: (nodeId: string) => void

  setNodeImage: (nodeId: string, dataUrl: string) => void
  removeNodeImage: (nodeId: string) => void
  setImageWidth: (nodeId: string, width: number) => void
  commitImageResize: (nodeId: string, width: number) => void

  resetAllPositions: () => void
  autoLayout: (type?: LayoutType) => void

  reparentNode: (nodeId: string, newParentId: string) => boolean
  moveNodeGroup: (
    nodeId: string,
    dx: number,
    dy: number,
    layoutPositions?: Map<string, ScenePosition>
  ) => void
}

export interface HistoryApi {
  save: () => void
  undo: () => void
  redo: () => void
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  clear: () => void
}