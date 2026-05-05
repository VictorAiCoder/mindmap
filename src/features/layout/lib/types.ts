// src/composables/layout/types.ts
import type { MindMapNode, ScenePosition } from '@entities/node'

/**
 * Идентификаторы поддерживаемых раскладок.
 * Должен совпадать с ключами LAYOUT_TYPES в useAutoLayout.ts.
 */
export type LayoutType =
  | 'mindmap'
  | 'spacious'
  | 'treeDown'
  | 'treeRight'
  | 'radial'
  | 'compact'

/** Карта "id узла → позиция", результат работы layout-функции */
export type LayoutPositions = Map<string, ScenePosition>

/** Функция, рассчитывающая раскладку */
export type LayoutFn = (root: MindMapNode) => LayoutPositions

/** Метаданные для UI (иконка, название, функция) */
export interface LayoutDescriptor {
  label: string
  icon: string
  fn: LayoutFn
}