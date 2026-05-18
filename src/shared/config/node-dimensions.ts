// src/shared/config/node-dimensions.ts
//
// Единые константы размеров узла — используются layout-алгоритмами (TS)
// и должны быть синхронизированы с CSS в компонентах.

// ═══════════════════════════════════════════════════════════════
// Ядро узла (текстовая часть)
// ═══════════════════════════════════════════════════════════════

export const NODE_CORE = {
  /** Ширина обычного узла */
  WIDTH: 250,
  /** Высота обычного узла */
  HEIGHT: 40,
  /** Ширина корневого узла */
  ROOT_WIDTH: 270,
  /** Высота корневого узла */
  ROOT_HEIGHT: 50,
} as const

// ═══════════════════════════════════════════════════════════════
// Картинка узла (NodeImage.vue)
// ═══════════════════════════════════════════════════════════════
//
// CSS: position: absolute; bottom: 100%; margin-bottom: 0.429em
// При base font-size 14px: 0.429em ≈ 6px

export const NODE_IMAGE = {
  /** Ширина по умолчанию */
  DEFAULT_WIDTH: 160,
  /** Высота по умолчанию (aspect ratio 0.75) */
  DEFAULT_HEIGHT: 120,
  /** Минимальная ширина (resize) */
  MIN_WIDTH: 100,
  /** Максимальная ширина (resize) */
  MAX_WIDTH: 1000,
  /** Отступ от узла (0.429em ≈ 6px) */
  MARGIN: 6,
  /** Aspect ratio по умолчанию (height / width) */
  ASPECT_RATIO: 0.75,
} as const

// ═══════════════════════════════════════════════════════════════
// Заметки узла (NodeNotesPreview.vue)
// ═══════════════════════════════════════════════════════════════
//
// CSS: position: absolute; top: 100%; margin-top: 0.429em
// При base font-size 14px: 0.429em ≈ 6px
// max-height: 11.429em ≈ 160px
// max-width: 20em ≈ 280px

export const NODE_NOTES = {
  /** Максимальная высота превью (11.429em ≈ 160px) */
  PREVIEW_MAX_HEIGHT: 160,
  /** Максимальная ширина превью (20em ≈ 280px) */
  PREVIEW_MAX_WIDTH: 280,
  /** Максимальная высота expanded (35.714em ≈ 500px) */
  EXPANDED_MAX_HEIGHT: 500,
  /** Максимальная ширина expanded (27.143em ≈ 380px) */
  EXPANDED_MAX_WIDTH: 380,
  /** Отступ от узла (0.429em ≈ 6px) */
  MARGIN: 6,
  /** Высота строки превью */
  LINE_HEIGHT: 18,
  /** Padding контейнера превью */
  PADDING: 26,
  /** Максимум строк в превью */
  MAX_PREVIEW_LINES: 7,
} as const

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Расчётная высота превью заметок для узла.
 * Возвращает 0 если заметок нет.
 */
export function calcNotesHeight(notes: string | null | undefined): number {
  if (!notes?.trim()) return 0
  const lineCount = notes.split('\n').length
  const previewLines = Math.min(lineCount, NODE_NOTES.MAX_PREVIEW_LINES)
  return previewLines * NODE_NOTES.LINE_HEIGHT + NODE_NOTES.PADDING
}

/**
 * Расчётная высота картинки узла.
 * Возвращает 0 если картинки нет.
 *
 * @param hasImage  — есть ли у узла картинка
 * @param imageWidth — ширина картинки (null = default)
 * @param aspectRatio — aspect ratio (null = default)
 */
export function calcImageHeight(
  hasImage: boolean,
  imageWidth: number | null = null,
  aspectRatio: number | null = null,
): number {
  if (!hasImage) return 0
  const w = imageWidth ?? NODE_IMAGE.DEFAULT_WIDTH
  const ar = aspectRatio ?? NODE_IMAGE.ASPECT_RATIO
  return Math.round(w * ar)
}
