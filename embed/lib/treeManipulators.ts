// embed/lib/treeManipulators.ts
import type { MindMapNode } from '@entities/node'
import { traverseTree } from '@entities/mindmap'

/** Accent color for enc (Terminal Monochrome). */
export const ENC_ACCENT = '#27b94b'

/** Default indigo that gets replaced by accent. */
const DEFAULT_INDIGO = '#5C6BC0'

/**
 * Post-processing pipeline для дерева mindmap.
 *
 * 1. Заменяет стандартный indigo (#5C6BC0) на accent-цвет
 * 2. Сворачивает узлы глубже maxDepth
 *
 * Вынесен из MindmapViewer.vue — был дублирован в parseMarkdown и loadFromApi.
 *
 * @param root    - корневой узел дерева
 * @param options.maxDepth - если задан, сворачивает узлы глубже этого значения
 */
export function processTree(
  root: MindMapNode,
  options?: { maxDepth?: number },
): void {
  applyAccentColor(root)
  if (options?.maxDepth !== undefined && options.maxDepth >= 0) {
    collapseBeyondDepth(root, 0, options.maxDepth)
  }
}

/**
 * Заменяет стандартный indigo (#5C6BC0) на accent-цвет.
 * Мутирует дерево на месте.
 */
export function applyAccentColor(root: MindMapNode): void {
  traverseTree(root, (node) => {
    if (node.color === DEFAULT_INDIGO) {
      node.color = ENC_ACCENT
    }
  })
}

/**
 * Сворачивает узлы глубже max.
 * Рекурсивно обходит дерево, ставит collapsed=true на узлах с depth >= max.
 */
export function collapseBeyondDepth(node: MindMapNode, depth: number, max: number): void {
  if (depth >= max && node.children.length > 0) {
    node.collapsed = true
  }
  if (!node.collapsed) {
    node.children.forEach(child => collapseBeyondDepth(child, depth + 1, max))
  }
}
