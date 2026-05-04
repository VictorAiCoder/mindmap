// src/entities/node/model/types.ts

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