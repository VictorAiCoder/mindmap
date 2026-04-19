// src/types/mindmap-api.ts
import type { Ref } from 'vue'
import type { MindMapNode, ScenePosition } from './mindmap'
import type { PositionMap } from './layout'

// ─── Layout ────────────────────────────────────────

export type LayoutType =
  | 'mindmap'
  | 'spacious'
  | 'treeDown'
  | 'treeRight'
  | 'radial'
  | 'compact'

/** Карта "id узла → позиция", результат работы layout-функции */
export type LayoutPositions = Map<string, ScenePosition>

/** Функция, рассчитывающая раскладку */
export type LayoutFn = (root: MindMapNode) => LayoutPositions

/** Метаданные для UI (иконка, название, функция) */
export interface LayoutDescriptor {
  label: string
  icon: string
  fn: LayoutFn
}

// ─── Tree Operations ───────────────────────────────

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
    layoutPositions?: PositionMap
  ) => void
}

// ─── History ───────────────────────────────────────

export interface HistoryApi {
  save: () => void
  undo: () => void
  redo: () => void
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  clear: () => void
}

// ─── DragDrop (ui-состояние для списков) ───────────

export interface DragDropApi {
  draggedNodeId: Ref<string | null>
  dropTargetNodeId: Ref<string | null>
  startDrag: (nodeId: string) => void
  setDropTarget: (nodeId: string) => void
  clearDropTarget: () => void
  finishDrop: () => boolean
  cancelDrag: () => void
}

// ─── Persistence ───────────────────────────────────

export type ExportFormat = 'json' | 'md' | 'markdown'

export interface PersistenceApi {
  exportTree: (format?: ExportFormat) => string
  importTree: (file: File) => Promise<MindMapNode>
}

// ─── Фасад ─────────────────────────────────────────

export interface MindMapApi extends TreeOperationsApi, PersistenceApi {
  rootNode: Ref<MindMapNode>

  /** UI-состояние drag&drop (для списков в панелях) */
  drag: DragDropApi

  // History
  undo: () => void
  redo: () => void
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>

  resetToDefault: () => void
  countNodes: () => number
  getDepth: () => number
}