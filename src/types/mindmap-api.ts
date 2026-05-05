// src/types/mindmap-api.ts
import type { Ref, ComputedRef } from 'vue'
import type { MindMapNode } from '@entities/node'
import type { SegmentOperationsApi } from '@/composables/image/useSegmentOperations'

// Re-exports — единая точка входа в API приложения
export type { HistoryApi } from '@/composables/useHistory'
export type {
  ResolvedImage,
  ImageStorageApi
} from '@/composables/image/useImageStorage'
export type { TreeOperationsApi } from '@/composables/tree/useTreeOperations'
export type {
  ExportFormat,
  PersistenceApi
} from '@/composables/persistence/usePersistence'
export type {
  LayoutType
} from '@features/layout'

// Локальные импорты для композиции MindMapApi
import type { TreeOperationsApi } from '@/composables/tree/useTreeOperations'
import type { ImageStorageApi } from '@/composables/image/useImageStorage'
import type { PersistenceApi } from '@/composables/persistence/usePersistence'

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