// src/composables/constants.ts

export const STORAGE_KEY = 'mindmap-data'
export const MAX_HISTORY = 50

/**
 * Палитра цветов для узлов.
 * readonly — чтобы случайно не мутировать push'ем.
 */
export const NODE_COLORS: readonly string[] = [
  '#5C6BC0', '#26A69A', '#FF7043', '#AB47BC',
  '#42A5F5', '#66BB6A', '#FFA726', '#EC407A',
  '#8D6E63', '#78909C', '#EF5350', '#29B6F6'
] as const

export const DEFAULT_COLOR = '#5C6BC0'
export const EXPORT_FILENAME_PREFIX = 'mindmap'

// Layout — размеры узлов
/** Размеры узлов */
export const NODE_W = 250
export const NODE_H = 40
export const ROOT_W = 270
export const ROOT_H = 50

/** Зазоры между узлами */
export const GAP_H = 150
export const GAP_V = 14

/** Отступы канваса */
export const CANVAS_PADDING = 120

/** Центр раскладки по умолчанию */
export const DEFAULT_CENTER_X = 1200
export const DEFAULT_CENTER_Y = 600

/** Высота строки превью заметки */
export const NOTE_LINE_HEIGHT = 18
export const NOTE_PADDING = 26
export const NOTE_MAX_PREVIEW_LINES = 7