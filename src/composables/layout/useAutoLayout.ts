// src/composables/layout/useAutoLayout.ts
import { traverseTree } from '../tree/useTreeTraversal'
import { layoutMindMap } from './layoutMindMap'
import { layoutTreeDown } from './layoutTreeDown'
import { layoutTreeRight } from './layoutTreeRight'
import { layoutRadial } from './layoutRadial'
import { layoutCompact } from './layoutCompact'
import { layoutSpacious } from './layoutSpacious'

import type { MindMapNode } from '@/types/mindmap'
import type {
  LayoutType,
  LayoutDescriptor
} from '@/types/mindmap-api'

/**
 * Реестр всех доступных раскладок.
 * Record<LayoutType, ...> гарантирует, что ключи полные — ни одного не забыли.
 */
export const LAYOUT_TYPES: Record<LayoutType, LayoutDescriptor> = {
  mindmap:   { label: 'Mind Map',       icon: 'mdi-brain',             fn: layoutMindMap },
  spacious:  { label: 'Просторная',     icon: 'mdi-arrow-expand-all',  fn: layoutSpacious },
  treeDown:  { label: 'Дерево вниз',    icon: 'mdi-file-tree',         fn: layoutTreeDown },
  treeRight: { label: 'Дерево вправо',  icon: 'mdi-file-tree-outline', fn: layoutTreeRight },
  radial:    { label: 'Радиальная',     icon: 'mdi-blur-radial',       fn: layoutRadial },
  compact:   { label: 'Компактная',     icon: 'mdi-view-compact',      fn: layoutCompact }
}

/**
 * Применяет выбранную раскладку к дереву.
 * Мутирует customX/customY всех узлов.
 */
export function applyAutoLayout(
  root: MindMapNode,
  type: LayoutType = 'mindmap'
): void {
  const layout = LAYOUT_TYPES[type]
  const positions = layout.fn(root)

  traverseTree(root, (node) => {
    const pos = positions.get(node.id)
    if (pos) {
      node.customX = pos.x
      node.customY = pos.y
    }
  })
}

/**
 * Сбрасывает все пользовательские координаты (возврат к layout-дефолтам).
 */
export function resetLayout(root: MindMapNode): void {
  traverseTree(root, (node) => {
    node.customX = null
    node.customY = null
  })
}