// src/composables/useTreeTraversal.js
// Паттерн: Visitor — единый обход дерева

/**
 * Универсальный обход дерева.
 * visitor(node, parent) может вернуть значение — тогда обход прекращается.
 */
export function traverseTree(node, visitor, parent = null) {
  const result = visitor(node, parent)
  if (result !== undefined) return result

  for (const child of node.children ?? []) {
    const childResult = traverseTree(child, visitor, node)
    if (childResult !== undefined) return childResult
  }
  return undefined
}

export function findNodeById(root, id) {
  return traverseTree(root, (node) =>
    node.id === id ? node : undefined
  ) ?? null
}

export function findParentOf(root, targetId) {
  return traverseTree(root, (node, parent) =>
    node.id === targetId ? parent : undefined
  ) ?? null
}

export function isDescendantOf(root, ancestorId) {
  return traverseTree(root, (node) =>
    node.id === ancestorId ? true : undefined
  ) ?? false
}

export function countNodes(node) {
  let count = 0
  traverseTree(node, () => { count++ })
  return count
}

export function getDepth(node) {
  if (!node.children?.length) return 1
  return 1 + Math.max(...node.children.map(getDepth))
}