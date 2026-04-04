// src/composables/layout/useAutoLayout.js
import { traverseTree } from '../tree/useTreeTraversal'
import { layoutMindMap } from './layoutMindMap'
import { layoutTreeDown } from './layoutTreeDown'
import { layoutTreeRight } from './layoutTreeRight'
import { layoutRadial } from './layoutRadial'
import { layoutCompact } from './layoutCompact'
import { layoutSpacious } from './layoutSpacious'

export const LAYOUT_TYPES = {
  mindmap:   { label: 'Mind Map',       icon: 'mdi-brain',            fn: layoutMindMap },
  spacious:  { label: 'Просторная',     icon: 'mdi-arrow-expand-all', fn: layoutSpacious },
  treeDown:  { label: 'Дерево вниз',    icon: 'mdi-file-tree',        fn: layoutTreeDown },
  treeRight: { label: 'Дерево вправо',  icon: 'mdi-file-tree-outline',fn: layoutTreeRight },
  radial:    { label: 'Радиальная',     icon: 'mdi-blur-radial',      fn: layoutRadial },
  compact:   { label: 'Компактная',     icon: 'mdi-view-compact',     fn: layoutCompact }
}

/**
 * Применяет выбранную раскладку к дереву
 */
export function applyAutoLayout(root, type = 'mindmap') {
  const layout = LAYOUT_TYPES[type]
  if (!layout) return

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
 * Сбрасывает все пользовательские координаты
 */
export function resetLayout(root) {
  traverseTree(root, (node) => {
    node.customX = null
    node.customY = null
  })
}