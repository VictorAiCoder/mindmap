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

/** Позиция узла в сцене */
export interface ScenePosition {
  x: number
  y: number
}

/** Результат layout-алгоритма */
export interface NodePosition {
  id: string
  node: MindMapNode
  x: number
  y: number
  w: number
  h: number
  depth: number
}

export interface SceneBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export interface LayoutData {
  positions: NodePosition[]
  bounds: SceneBounds
}

export interface Connection {
  id: string
  path: string
  color: string
}

/** Сериализованная карта (для export/import / будущего бэка) */
export interface SerializedMindMap {
  version: number
  title?: string
  rootNode: MindMapNode
  exportedAt: string
}