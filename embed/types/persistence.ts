import type { MindMapDocument } from '@entities/mindmap'

export type ExportFormat = 'json' | 'md' | 'markdown'

export interface PersistenceApi {
  exportTree: (format?: ExportFormat) => string
  importTree(file: File): Promise<MindMapDocument>
  /** Вернуть markdown-текст дерева (без скачивания). hiddenSections — тексты узлов для исключения. */
  getMarkdown: (hiddenSections?: string[]) => string
}
