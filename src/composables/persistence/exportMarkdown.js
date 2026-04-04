// src/composables/persistence/exportMarkdown.js

const MAX_HEADING = 6

/**
 * Конвертирует узел в строки markdown
 */
function nodeToMarkdownLines(node, depth = 0) {
  const lines = []

  // Заголовок
  if (depth < MAX_HEADING) {
    lines.push(`${'#'.repeat(depth + 1)} ${node.text}`)
  } else {
    const indent = '> '.repeat(depth - MAX_HEADING + 1)
    lines.push(`${indent}**${node.text}**`)
  }

  lines.push('')

  // Картинка сразу после заголовка
  if (node.image) {
    lines.push(`![${node.text}](${node.image})`)
    lines.push('')
  }

  // Заметки
  if (node.notes?.trim()) {
    lines.push(node.notes.trim())
    lines.push('')
  }

  // Дети рекурсивно
  if (node.children?.length) {
    for (const child of node.children) {
      lines.push(...nodeToMarkdownLines(child, depth + 1))
    }
  }

  return lines
}

/**
 * Убирает лишние пустые строки (максимум 2 подряд)
 */
function cleanEmptyLines(lines) {
  const result = []
  let emptyCount = 0

  for (const line of lines) {
    if (line.trim() === '') {
      emptyCount++
      if (emptyCount <= 2) result.push(line)
    } else {
      emptyCount = 0
      result.push(line)
    }
  }

  // Убираем пустые в конце
  while (result.length && !result[result.length - 1].trim()) {
    result.pop()
  }

  return result
}

/**
 * Конвертирует дерево в markdown-строку
 */
export function treeToMarkdown(root) {
  const lines = nodeToMarkdownLines(root, 0)
  const cleaned = cleanEmptyLines(lines)
  return cleaned.join('\n') + '\n'
}