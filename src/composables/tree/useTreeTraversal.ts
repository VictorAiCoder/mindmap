// src/composables/tree/useTreeTraversal.ts
import type { MindMapNode } from '@entities/node'

/**
 * Обход дерева в глубину. Вызывает callback для каждого узла.
 */
export function traverseTree(
  node: MindMapNode | null | undefined,
  callback: (node: MindMapNode) => void
): void {
  if (!node) return
  callback(node)
  node.children?.forEach(child => traverseTree(child, callback))
}

/**
 * Найти узел по id. Возвращает null, если не найден.
 */
export function findNodeById(
  root: MindMapNode | null | undefined,
  id: string
): MindMapNode | null {
  if (!root || !id) return null
  if (root.id === id) return root
  if (!root.children) return null

  for (const child of root.children) {
    const found = findNodeById(child, id)
    if (found) return found
  }
  return null
}

/**
 * Найти родителя узла.
 */
export function findParentOf(
  root: MindMapNode | null | undefined,
  nodeId: string
): MindMapNode | null {
  if (!root?.children) return null

  for (const child of root.children) {
    if (child.id === nodeId) return root
    const found = findParentOf(child, nodeId)
    if (found) return found
  }
  return null
}

/**
 * Подсчитать количество узлов в поддереве.
 */
export function countNodes(node: MindMapNode | null | undefined): number {
  if (!node) return 0
  const childrenCount =
    node.children?.reduce((sum, c) => sum + countNodes(c), 0) ?? 0
  return 1 + childrenCount
}

/**
 * Максимальная глубина поддерева (0 = только корень).
 */
export function getDepth(node: MindMapNode | null | undefined): number {
  if (!node?.children?.length) return 0
  return 1 + Math.max(...node.children.map(getDepth))
}

/**
 * Проверяет: является ли nodeId потомком ancestorId (или им самим).
 */
export function isDescendantOf(
  root: MindMapNode,
  ancestorId: string,
  nodeId: string
): boolean {
  const ancestor = findNodeById(root, ancestorId)
  if (!ancestor) return false

  function check(node: MindMapNode): boolean {
    if (node.id === nodeId) return true
    return node.children?.some(check) ?? false
  }

  return check(ancestor)
}

/**
 * Отсоединяет узел от родителя и возвращает его.
 * Root отсоединить нельзя — вернёт null.
 */
export function detachNode(
  root: MindMapNode,
  nodeId: string
): MindMapNode | null {
  const parent = findParentOf(root, nodeId)
  if (!parent?.children) return null

  const idx = parent.children.findIndex(c => c.id === nodeId)
  if (idx === -1) return null

  // ★ noUncheckedIndexedAccess: splice возвращает массив, [0] может быть undefined
  const removed = parent.children.splice(idx, 1)
  return removed[0] ?? null
}

/**
 * Собирает Set всех ID в поддереве (включая сам узел).
 */
export function collectDescendantIds(node: MindMapNode): Set<string> {
  const ids = new Set<string>()

  function walk(n: MindMapNode): void {
    ids.add(n.id)
    n.children?.forEach(walk)
  }

  walk(node)
  return ids
}

/**
 * Собирает Set ID видимых потомков (с учётом collapsed).
 * Свёрнутые поддеревья не обходятся.
 */
export function collectVisibleDescendantIds(node: MindMapNode): Set<string> {
  const ids = new Set<string>()

  function walk(n: MindMapNode): void {
    ids.add(n.id)
    if (!n.collapsed && n.children) {
      n.children.forEach(walk)
    }
  }

  walk(node)
  return ids
}