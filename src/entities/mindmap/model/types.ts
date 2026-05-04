// src/entities/mindmap/model/types.ts
import type { MindMapNode } from '@entities/node'
import type { StoredImage } from '@entities/image'

/**
 * Документ интеллект-карты — корневая структура для хранения/экспорта.
 * Объединяет дерево узлов с пулом ресурсов (картинки).
 */
export interface MindMapDocument {
  version: 2
  root: MindMapNode
  images: StoredImage[]
}