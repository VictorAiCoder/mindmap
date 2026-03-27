// src/composables/useTreeTraversal.js
/**
 * Обход дерева, поиск узлов и вспомогательные функции
 */

export function traverseTree(node, callback) {
  if (!node) return
  callback(node)
  if (node.children) {
    node.children.forEach(child => traverseTree(child, callback))
  }
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
  let count = 1
  if (node.children) {
    node.children.forEach(child => { count += countNodes(child) })
  }
  return count
}

export function getDepth(node) {
  if (!node?.children?.length) return 0
  return 1 + Math.max(...node.children.map(getDepth))
}

/**
 * ★ Проверяет, является ли потенциальный потомок
 * действительно потомком ancestor
 */
export function isDescendantOf(root, ancestorId, nodeId) {
  const ancestor = findNodeById(root, ancestorId)
  if (!ancestor) return false

  function check(node) {
    if (node.id === nodeId) return true
    if (!node.children) return false
    return node.children.some(child => check(child))
  }

  return check(ancestor)
}

/**
 * ★ Удаляет узел из родителя и возвращает его
 */
export function detachNode(root, nodeId) {
  const parent = findParentOf(root, nodeId)
  if (!parent?.children) return null

  const idx = parent.children.findIndex(c => c.id === nodeId)
  if (idx === -1) return null

  const [node] = parent.children.splice(idx, 1)
  return node
}