// src/entities/image/model/types.ts

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