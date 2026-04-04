// src/composables/persistence/importMarkdown.js
import { createNode } from '../tree/useNodeFactory'
import { NODE_COLORS } from '../../constants'

function pickColor(index) {
  return NODE_COLORS[index % NODE_COLORS.length]
}

/**
 * Парсит заголовок: "### Текст" → { level: 3, text: "Текст" }
 */
function parseHeading(line) {
  const match = line.match(/^(#{1,6})\s+(.+)/)
  if (!match) return null
  return { level: match[1].length, text: match[2].trim() }
}

/**
 * Проверяет, является ли строка только картинкой
 */
function isImageLine(line) {
  return /^\s*!$$[^$$]*\]$[^)]+$\s*$/.test(line)
}

/**
 * Извлекает URL картинки из строки
 */
function extractImageUrl(line) {
  const match = line.match(/!$$[^$$]*\]$([^)\s]+)$/)
  return match ? match[1] : null
}

/**
 * Разбивает markdown на секции (заголовок + контент)
 */
function splitIntoSections(lines) {
  const sections = []
  let current = null

  for (const line of lines) {
    const heading = parseHeading(line)

    if (heading) {
      current = { level: heading.level, text: heading.text, contentLines: [] }
      sections.push(current)
    } else if (current) {
      current.contentLines.push(line)
    }
  }

  return sections
}

/**
 * Из контента секции извлекает image и notes.
 *
 * Правила:
 *   - Пустые строки в начале пропускаются
 *   - Первая картинка (до любого текста) → image
 *   - Всё остальное → notes
 */
function processContent(lines) {
  let image = null
  const notesLines = []
  let seenText = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Пустые строки до контента — пропускаем
    if (!trimmed && !seenText && !image) continue

    // Пустые строки между картинкой и текстом — пропускаем
    if (!trimmed && image && !seenText) continue

    // Первая картинка до текста → image узла
    if (!seenText && !image && isImageLine(line)) {
      image = extractImageUrl(line)
      continue
    }

    // Всё остальное → notes
    if (trimmed) seenText = true
    notesLines.push(line)
  }

  // Убираем пустые строки в начале/конце
  while (notesLines.length && !notesLines[0].trim()) notesLines.shift()
  while (notesLines.length && !notesLines[notesLines.length - 1].trim()) notesLines.pop()

  return { notes: notesLines.join('\n'), image }
}

/**
 * Строит дерево из плоского массива узлов с depth
 */
function buildTree(nodes) {
  if (!nodes.length) return null

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

    // Находим родителя
    while (stack.length > depth) stack.pop()
    while (stack.length <= depth) stack.push(stack[stack.length - 1])

    const parent = stack[depth]
    parent.children = parent.children || []
    parent.children.push(node)

    stack[depth + 1] = node
    stack.length = depth + 2
  }

  return root
}

/**
 * Главная функция — парсит markdown в дерево
 */
export function parseMarkdownToTree(markdownText) {
  if (!markdownText?.trim()) {
    throw new Error('Файл пуст')
  }

  const lines = markdownText.split('\n')
  const sections = splitIntoSections(lines)

  // Нет заголовков — весь текст = один узел
  if (!sections.length) {
    const text = lines.find(l => l.trim())?.trim() || 'Mind Map'
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

  return buildTree(nodes)
}