import type { MindMapDocument } from '@entities/mindmap'

export type ExportFormat = 'json' | 'md' | 'markdown'

export interface PersistenceApi {
  exportTree: (format?: ExportFormat) => string
  importTree(file: File): Promise<MindMapDocument>
}
