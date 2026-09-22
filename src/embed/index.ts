// embed/index.ts — public API for mindmap-embed

// ─── Components ──────────────────────────────────
export { default as MindmapViewer } from './MindmapViewer.vue'
export { default as MindMapCanvas } from './components/MindMapCanvas.vue'
export { default as EmbedNode } from './components/EmbedNode.vue'

// ─── Composables ─────────────────────────────────
export { useMindMapApi } from './composables/useMindMapApi'
export { useTreeOperations } from './composables/useTreeOperations'
export { useHistory } from './composables/useHistory'
export { useImageStorage } from './composables/useImageStorage'
export { usePersistence } from './composables/usePersistence'
export { useSegmentOperations } from './composables/useSegmentOperations'
export { useNodeDrag } from './composables/useNodeDrag'
export { usePanZoom } from './composables/usePanZoom'
export { useConnections } from './composables/useConnections'
export { useLayout } from './lib/layout'
export { LAYOUT_TYPES } from '@features/layout'
export { parseMarkdownToTree } from './lib/parse'
export { exportToMarkdown } from './lib/export'
export { renderMarkdown, configureMarkdown } from './lib/markdown'
export { renderMermaidInHtml } from './lib/mermaid'

// ─── Types ───────────────────────────────────────
export type { MindMapApi, NotifyFn, NotifyColor } from './types/mindmap-api'
export type { HistoryApi } from './types/history'
export type { ImageStorageApi, ResolvedImage } from './types/image-storage'
export type { PersistenceApi, ExportFormat } from './types/persistence'
export type { TreeOperationsApi } from './types/tree-operations'
export type { SegmentOperationsApi } from './types/segment-operations'
export type { NodeDragState } from './types/node-drag'
export type { MindmapViewerProps, LayoutType } from './types'
export type { MindMapDocument } from '@entities/mindmap'
export type { EmbedSlots, EmbedNodeImageSlotProps, EmbedNodeNotesSlotProps, EmbedNodeMenuSlotProps } from './injection-keys'
export type { LayoutPosition, LayoutBounds, LayoutData, PositionMap } from './lib/layout'

// ─── Injection Keys ──────────────────────────────
export { embedSlotsKey, mindMapKey, notifyKey } from './injection-keys'
