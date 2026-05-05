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
 * Центр узла в координатах сцены.
 * Отличается от ScenePosition семантически: ScenePosition — левый-верхний угол,
 * Center2D — геометрический центр (используется для операций, сохраняющих
 * визуальную позицию при ресайзе: scale, image resize и т.п.).
 */
export interface Center2D {
  cx: number
  cy: number
}

/**
 * Нормализованный прямоугольник в координатах [0..1].
 * Используется для вырезок (сегментов) изображений — не зависит от
 * пиксельных размеров оригинала.
 *
 * Инварианты (ожидаются на входе, НЕ проверяются в runtime):
 *   - 0 ≤ x, y ≤ 1
 *   - 0 < w, h ≤ 1
 *   - x + w ≤ 1, y + h ≤ 1
 *
 * Sanitize-логика, обеспечивающая инварианты, живёт в
 * useImageStorage.sanitizeClip.
 */
export interface Clip {
  x: number
  y: number
  w: number
  h: number
}

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
 * Координаты clip нормализованы в [0..1] — не зависят от пикселей оригинала.
 */
export interface ImageSegment {
  kind: 'segment'
  id: string
  sourceId: string
  clip: Clip
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