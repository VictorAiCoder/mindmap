// src/composables/persistence/importMarkdown.js
import { createNode } from '../tree/useNodeFactory'
import { NODE_COLORS } from '../../constants'

function pickColor(index) {
  return NODE_COLORS[index % NODE_COLORS.length]
}

// ═══════════════════════════════════════════
// Парсеры строк
// ═══════════════════════════════════════════

function parseHeading(line) {
  const match = line.match(/^(#{1,6})\s+(.+)/)
  if (!match) return null
  return { level: match[1].length, text: match[2].trim() }
}

function isImageOnlyLine(line) {
  return /^\s*!$$[^$$]*\]$[^)]+$\s*$/.test(line)
}

function extractImageUrl(line) {
  const match = line.match(/!$$[^$$]*\]$([^)\s]+)$/)
  return match ? match[1] : null
}

function isCodeFenceLine(line) {
  return /^\s*(`{3,}|~{3,})/.test(line)
}

// ═══════════════════════════════════════════
// Разбиение на секции
// ═══════════════════════════════════════════

function splitIntoSections(lines) {
  const sections = []
  let current = null
  let insideCodeBlock = false

  for (const line of lines) {
    if (isCodeFenceLine(line)) {
      insideCodeBlock = !insideCodeBlock
      if (current) current.contentLines.push(line)
      continue
    }

    if (insideCodeBlock) {
      if (current) current.contentLines.push(line)
      continue
    }

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

// ═══════════════════════════════════════════
// Обработка контента секции
// ═══════════════════════════════════════════

function processContent(lines) {
  let image = null
  const notesLines = []
  let seenText = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed && !seenText && !image) continue
    if (!trimmed && image && !seenText) continue

    if (!seenText && !image && isImageOnlyLine(line)) {
      image = extractImageUrl(line)
      continue
    }

    if (trimmed) seenText = true
    notesLines.push(line)
  }

  while (notesLines.length && !notesLines[0].trim()) notesLines.shift()
  while (notesLines.length && !notesLines[notesLines.length - 1].trim()) notesLines.pop()

  return { notes: notesLines.join('\n'), image }
}

// ═══════════════════════════════════════════
// Построение дерева из плоского списка
// ═══════════════════════════════════════════

/**
 * Строит дерево из плоского массива { depth, node }.
 *
 * stack — массив, где stack[depth] = последний узел на этой глубине.
 * Для узла с depth D родитель = stack[D - 1].
 *
 * Пример:
 *
 *   depth 0: "Корень"        stack: [Корень]
 *   depth 1: "Ветка A"       parent = stack[0] = Корень     stack: [Корень, Ветка A]
 *   depth 2: "Подветка A1"   parent = stack[1] = Ветка A    stack: [Корень, Ветка A, Подветка A1]
 *   depth 2: "Подветка A2"   parent = stack[1] = Ветка A    stack: [Корень, Ветка A, Подветка A2]
 *   depth 1: "Ветка B"       parent = stack[0] = Корень     stack: [Корень, Ветка B]
 *   depth 2: "Подветка B1"   parent = stack[1] = Ветка B    stack: [Корень, Ветка B, Подветка B1]
 *   depth 3: "Лист B1a"      parent = stack[2] = Подветка   stack: [Корень, Ветка B, Подветка B1, Лист B1a]
 *
 * Результат:
 *   Корень
 *   ├── Ветка A
 *   │   ├── Подветка A1
 *   │   └── Подветка A2
 *   └── Ветка B
 *       └── Подветка B1
 *           └── Лист B1a
 *
 * Пропуск уровней (# → ###):
 *   depth 0: "Корень"         stack: [Корень]
 *   depth 2: "Подветка"       D-1 = 1, stack[1] нет → берём stack[0] = Корень
 *                              → Подветка становится ребёнком Корня
 */
function buildTree(nodes) {
  if (!nodes.length) return null

  const root = nodes[0].node

  // stack[i] = последний размещённый узел на глубине i
  const stack = [root]

  for (let i = 1; i < nodes.length; i++) {
    const { depth, node } = nodes[i]

    // Находим родителя: ближайший узел на уровне depth - 1 или выше
    const parent = findParentInStack(stack, depth)

    parent.children = parent.children || []
    parent.children.push(node)

    // Записываем узел на его уровень глубины
    // и обрезаем стек — всё что глубже больше не актуально
    stack[depth] = node
    stack.length = depth + 1
  }

  return root
}

/**
 * Ищет родителя в стеке для узла с заданной глубиной.
 *
 * Родитель = stack[depth - 1].
 * Если depth - 1 за пределами стека (пропуск уровней),
 * берём последний доступный элемент стека.
 *
 * Если depth === 0, родитель = stack[0] (корень).
 */
function findParentInStack(stack, depth) {
  if (depth <= 0) return stack[0]

  // Идеальный случай: родитель на уровне выше
  const parentDepth = depth - 1

  if (parentDepth < stack.length && stack[parentDepth]) {
    return stack[parentDepth]
  }

  // Пропуск уровней: идём вверх по стеку до первого непустого
  for (let d = parentDepth; d >= 0; d--) {
    if (d < stack.length && stack[d]) {
      return stack[d]
    }
  }

  // Fallback — корень
  return stack[0]
}

// ═══════════════════════════════════════════
// Главная функция
// ═══════════════════════════════════════════

export function parseMarkdownToTree(markdownText) {
  if (!markdownText?.trim()) {
    throw new Error('Файл пуст')
  }

  const lines = markdownText.split('\n')
  const sections = splitIntoSections(lines)

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