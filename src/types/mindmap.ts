// src/types/mindmap.ts

/**
 * Узел интеллект-карты.
 *
 * Инварианты (гарантии, поддерживаемые createNode):
 *   - id, text, color, notes — всегда строки
 *   - children — всегда массив (может быть пустой)
 *   - collapsed — всегда boolean
 *   - image, customX, customY, imageWidth — число/строка или null
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

  image: string | null
  imageWidth: number | null

  customX: number | null
  customY: number | null
}

/** Позиция узла в сцене (абсолютные координаты в world-space) */
export interface ScenePosition {
  x: number
  y: number
}