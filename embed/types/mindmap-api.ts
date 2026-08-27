import type { Ref, ComputedRef } from 'vue'
import type { MindMapNode } from '@entities/node'
import type { SegmentOperationsApi } from './segment-operations'
import type { HistoryApi } from './history'
import type { ImageStorageApi } from './image-storage'
import type { TreeOperationsApi } from './tree-operations'
import type { PersistenceApi } from './persistence'
import type { LayoutType } from '@features/layout/lib/types'

export type { HistoryApi } from './history'
export type { ResolvedImage, ImageStorageApi } from './image-storage'
export type { TreeOperationsApi } from './tree-operations'
export type { ExportFormat, PersistenceApi } from './persistence'
export type { SegmentOperationsApi } from './segment-operations'
export type { LayoutType } from '@features/layout/lib/types'

// ─── Notify function type ───────────────────────

export type NotifyColor = 'success' | 'error' | 'warning' | 'info'
export type NotifyFn = (text: string, color?: NotifyColor, icon?: string) => void

// ─── Main API facade ────────────────────────────

export interface MindMapApi extends TreeOperationsApi, PersistenceApi, SegmentOperationsApi {
  rootNode: Ref<MindMapNode>
  
  undo: () => void
  redo: () => void
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  
  resetToDefault: () => void
  
  nodeCount: ComputedRef<number>
  treeDepth: ComputedRef<number>
  unusedImageCount: ComputedRef<number>
  
  imageStorage: ImageStorageApi
}
