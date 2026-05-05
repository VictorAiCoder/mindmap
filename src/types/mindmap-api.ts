// src/types/mindmap-api.ts
import type { Ref, ComputedRef } from 'vue'
import type { MindMapNode } from '@entities/node'
import type { SegmentOperationsApi } from '@/features/image-gallery/lib/useSegmentOperations'

// Re-exports — единая точка входа в API приложения
export type { HistoryApi } from '@/app/model/useHistory'
export type {
  ResolvedImage,
  ImageStorageApi
} from '@/app/store/useImageStorage'
export type { TreeOperationsApi } from '@/entities/mindmap/model/useTreeOperations'
export type {
  ExportFormat,
  PersistenceApi
} from '@/features/persistence/model/usePersistence'
export type {
  LayoutType
} from '@features/layout'

// Локальные импорты для композиции MindMapApi
import type { TreeOperationsApi } from '@/entities/mindmap/model/useTreeOperations'
import type { ImageStorageApi } from '@/app/store/useImageStorage'
import type { PersistenceApi } from '@/features/persistence/model/usePersistence'

// ─── Главный фасад приложения ──────────────────────

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