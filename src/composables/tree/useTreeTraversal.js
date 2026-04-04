// src/composables/tree/useTreeTraversal.js
// ★ Добавить новую функцию — собрать все ID потомков

export function traverseTree(node, callback) {
  if (!node) return
  callback(node)
  node.children?.forEach(child => traverseTree(child, callback))
}

export function findNodeById(root, id) {
  if (!root || !id) return null
  if (root.id === id) return root
  if (!root.children) return null

  for (const child of root.children) {
    const found = findNodeById(child, id)
    if (found) return found
  }
  return null
}

export function findParentOf(root, nodeId) {
  if (!root?.children) return null

  for (const child of root.children) {
    if (child.id === nodeId) return root
    const found = findParentOf(child, nodeId)
    if (found) return found
  }
  return null
}

export function countNodes(node) {
  if (!node) return 0
  return 1 + (node.children?.reduce((sum, c) => sum + countNodes(c), 0) ?? 0)
}

export function getDepth(node) {
  if (!node?.children?.length) return 0
  return 1 + Math.max(...node.children.map(getDepth))
}

export function isDescendantOf(root, ancestorId, nodeId) {
  const ancestor = findNodeById(root, ancestorId)
  if (!ancestor) return false

  function check(node) {
    if (node.id === nodeId) return true
    return node.children?.some(check) ?? false
  }

  return check(ancestor)
}

export function detachNode(root, nodeId) {
  const parent = findParentOf(root, nodeId)
  if (!parent?.children) return null

  const idx = parent.children.findIndex(c => c.id === nodeId)
  if (idx === -1) return null

  return parent.children.splice(idx, 1)[0]
}

/**
 * ★ Собирает Set всех ID потомков узла (включая сам узел)
 */
export function collectDescendantIds(node) {
  const ids = new Set()

  function walk(n) {
    ids.add(n.id)
    n.children?.forEach(walk)
  }

  walk(node)
  return ids
}

/**
 * ★ Собирает Set ID потомков, исключая свёрнутые поддеревья
 */
export function collectVisibleDescendantIds(node) {
  const ids = new Set()

  function walk(n) {
    ids.add(n.id)
    if (!n.collapsed && n.children) {
      n.children.forEach(walk)
    }
  }

  walk(node)
  return ids
}