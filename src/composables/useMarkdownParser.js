// src/composables/useMarkdownParser.js
import { createNode } from './useNodeFactory'
import { NODE_COLORS } from './constants'

function pickColor(index) {
  return NODE_COLORS[index % NODE_COLORS.length]
}

function parseHeading(line) {
  const match = line.match(/^(#{1,6})\s+(.+)/)
  if (!match) return null
  return { level: match[1].length, text: match[2].trim() }
}

/**
 * ★ Исправлено: более гибкий парсинг картинки
 * Ищем ![alt](url) в строке — может быть с пробелами вокруг
 */
function parseImage(line) {
  const match = line.trim().match(/^!$$([^$$]*)\]$([^)\s]+(?:\s+"[^"]*")?)$$/)
  if (match) return { alt: match[1], url: match[2].split(/\s/)[0] }

  // Более мягкий паттерн — картинка где-то в строке
  const loose = line.match(/!$$([^$$]*)\]$([^)\s]+)$/)
  if (loose) return { alt: loose[1], url: loose[2] }

  return null
}

/**
 * ★ Проверяет является ли строка ТОЛЬКО картинкой (без другого текста)
 */
function isImageOnlyLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return false
  // Строка целиком — одна картинка
  return /^!$$[^$$]*\]$[^)]+$$/.test(trimmed)
}

/**
 * Обрабатывает контент секции.
 *
 * Правила:
 *   1. Пропускаем пустые строки в начале
 *   2. Первая строка-картинка (до любого текста) → node.image
 *   3. Остальное → notes
 */
function processContent(lines) {
  let image = null
  const notesLines = []
  let seenNonEmptyText = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Пустые строки до контента — пропускаем
    if (!trimmed && !seenNonEmptyText && !image) {
      continue
    }

    // Пустые строки после картинки, но до текста — пропускаем
    if (!trimmed && image && !seenNonEmptyText) {
      continue
    }

    if (!seenNonEmptyText && !image && isImageOnlyLine(line)) {
      // ★ Первая картинка до текста → image узла
      const img = parseImage(line)
      if (img) {
        image = img.url
        continue
      }
    }

    // Всё остальное → notes
    if (trimmed) {
      seenNonEmptyText = true
    }
    notesLines.push(line)
  }

  // Убираем пустые строки в начале/конце notes
  while (notesLines.length && !notesLines[0].trim()) notesLines.shift()
  while (notesLines.length && !notesLines[notesLines.length - 1].trim()) notesLines.pop()

  return {
    notes: notesLines.join('\n'),
    image
  }
}

/**
 * Парсит markdown в дерево интеллект-карты
 */
export function parseMarkdownToTree(markdownText) {
  if (!markdownText?.trim()) {
    throw new Error('Файл пуст')
  }

  const lines = markdownText.split('\n')

  const sections = []
  let currentSection = null

  for (const line of lines) {
    const heading = parseHeading(line)

    if (heading) {
      currentSection = {
        level: heading.level,
        text: heading.text,
        contentLines: []
      }
      sections.push(currentSection)
    } else if (currentSection) {
      currentSection.contentLines.push(line)
    }
  }

  if (!sections.length) {
    const firstNonEmpty = lines.find(l => l.trim())
    const text = firstNonEmpty?.trim() || 'Mind Map'
    return createNode({
      text,
      color: NODE_COLORS[0],
      notes: lines.join('\n').trim()
    })
  }

  const minLevel = Math.min(...sections.map(s => s.level))

  let colorIdx = 0

  const nodes = sections.map(section => {
    const { notes, image } = processContent([...section.contentLines])
    return {
      depth: section.level - minLevel,
      node: createNode({
        text: section.text,
        color: pickColor(colorIdx++),
        notes,
        image
      })
    }
  })

  const root = nodes[0].node
  const stack = [root]

  for (let i = 1; i < nodes.length; i++) {
    const { depth, node } = nodes[i]

    if (depth === 0) {
      root.children = root.children || []
      root.children.push(node)
      stack.length = 1
      stack[1] = node
      continue
    }

    while (stack.length > depth) {
      stack.pop()
    }

    while (stack.length <= depth) {
      stack.push(stack[stack.length - 1])
    }

    const parent = stack[depth]
    parent.children = parent.children || []
    parent.children.push(node)

    stack[depth + 1] = node
    stack.length = depth + 2
  }

  return root
}