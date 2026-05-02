// src/types/mindmap.ts

/**
 * Узел интеллект-карты.
 *
 * Инварианты (гарантии, поддерживаемые createNode):
 *   - id, text, color, notes — всегда строки
 *   - children — всегда массив (может быть пустой)
 *   - collapsed — всегда boolean
 *   - imageId, customX, customY, imageWidth — строка/число или null
 *     (null = "не задано", используется layout/авто-значение)
 *
 * Опциональные поля (могут быть undefined):
 *   - notesPinned, notesVisible — появляются только после toggle
 */
export interface MindMapNode {
  id: string
  text: string
  color: string
  children: MindMapNode[]
  collapsed: boolean

  notes: string
  notesPinned?: boolean
  notesVisible?: boolean

  /**
   * Ссылка на запись в MindMapDocument.images.
   * null = у узла нет картинки.
   *
   * ⚠️ Больше НЕ хранит dataUrl — только id.
   */
  imageId: string | null
  imageWidth: number | null

  customX: number | null
  customY: number | null

  scale?: number
}

/** Позиция узла в сцене (абсолютные координаты в world-space) */
export interface ScenePosition {
  x: number
  y: number
}

// ════════════════════════════════════════════════════════════
// Изображения (пул ресурсов документа)
// ════════════════════════════════════════════════════════════

/**
 * Сырое изображение, загруженное пользователем.
 * Хранит полный dataUrl (base64).
 */
export interface RawImage {
  kind: 'raw'
  id: string
  dataUrl: string
  /** Имя файла или заголовок, для галереи */
  name?: string
  /** Unix ms, когда добавлено */
  createdAt?: number
}

/**
 * Сегмент (прямоугольная область) другой картинки.
 * Не дублирует данные — ссылается на RawImage через sourceId.
 *
 * Координаты clip нормализованы в диапазоне [0..1],
 * чтобы не зависеть от пикселей оригинала.
 *
 * 💡 Пока НЕ используется (зарезервировано под Коммит 3).
 */
export interface ImageSegment {
  kind: 'segment'
  id: string
  sourceId: string
  clip: { x: number; y: number; w: number; h: number }
  name?: string
  createdAt?: number
}

export type StoredImage = RawImage | ImageSegment

/**
 * Документ интеллект-карты — корневая структура для хранения/экспорта.
 * Объединяет дерево узлов с пулом ресурсов (картинки).
 */
export interface MindMapDocument {
  version: 2
  root: MindMapNode
  images: StoredImage[]
}