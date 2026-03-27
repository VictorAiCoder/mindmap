// src/composables/useMarkdownParser.js
import { createNode } from './useNodeFactory'
import { NODE_COLORS } from './constants'

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
 * Парсит markdown в дерево.
 *
 * Правила:
 *   - Каждый заголовок (#, ##, ### ...) = узел карты
 *   - Уровень заголовка = глубина узла (# = 0, ## = 1, ### = 2 ...)
 *   - Всё содержимое между текущим заголовком и следующим = notes узла
 *   - Вложенность определяется уровнем: ## — ребёнок последнего #, ### — ребёнок последнего ## и т.д.
 *   - ![alt](url) в заметках — если это единственная картинка, сохраняем как node.image
 */
export function parseMarkdownToTree(markdownText) {
  if (!markdownText?.trim()) {
    throw new Error('Файл пуст')
  }

  const lines = markdownText.split('\n')

  // Шаг 1: разбиваем на секции (заголовок + контент под ним)
  const sections = []
  let currentSection = null

  for (const line of lines) {
    const heading = parseHeading(line)

    if (heading) {
      // Новая секция
      currentSection = {
        level: heading.level,
        text: heading.text,
        contentLines: []
      }
      sections.push(currentSection)
    } else if (currentSection) {
      // Контент текущей секции
      currentSection.contentLines.push(line)
    }
    // Строки до первого заголовка — игнорируем
  }

  // Если нет ни одного заголовка — весь текст = один корень
  if (!sections.length) {
    const text = lines.find(l => l.trim())?.trim() || 'Mind Map'
    return createNode({
      text,
      color: NODE_COLORS[0],
      notes: lines.join('\n').trim()
    })
  }

  // Шаг 2: из контента извлекаем notes и image
  function processContent(contentLines) {
    // Убираем пустые строки в начале и конце
    while (contentLines.length && !contentLines[0].trim()) contentLines.shift()
    while (contentLines.length && !contentLines[contentLines.length - 1].trim()) contentLines.pop()

    let image = null
    const notesLines = []

    for (const line of contentLines) {
      const imgMatch = line.trim().match(/^!$$([^$$]*)\]$([^)]+)$$/)
      if (imgMatch && !image) {
        // Первая картинка — сохраняем как image узла
        image = imgMatch[2]
      } else {
        notesLines.push(line)
      }
    }

    // Убираем пустые строки в начале/конце notes
    while (notesLines.length && !notesLines[0].trim()) notesLines.shift()
    while (notesLines.length && !notesLines[notesLines.length - 1].trim()) notesLines.pop()

    return {
      notes: notesLines.join('\n'),
      image
    }
  }

  // Шаг 3: строим дерево по уровням заголовков
  // Нормализуем: минимальный уровень заголовка = корень (depth 0)
  const minLevel = Math.min(...sections.map(s => s.level))

  let colorIdx = 0

  // Создаём узлы
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

  // Корень — первый узел (depth 0)
  const root = nodes[0].node

  // Стек для отслеживания текущей цепочки родителей
  // stack[i] = узел на глубине i
  const stack = [root]

  for (let i = 1; i < nodes.length; i++) {
    const { depth, node } = nodes[i]

    if (depth === 0) {
      // Ещё один корневой заголовок — делаем ребёнком корня (depth 1)
      root.children = root.children || []
      root.children.push(node)
      stack.length = 1
      stack[1] = node
      continue
    }

    // Находим родителя: ближайший узел с depth < текущего
    // Обрезаем стек до нужного уровня
    while (stack.length > depth) {
      stack.pop()
    }

    // Если стек короче — заполняем последним известным
    while (stack.length <= depth) {
      stack.push(stack[stack.length - 1])
    }

    const parent = stack[depth]
    parent.children = parent.children || []
    parent.children.push(node)

    // Записываем текущий узел в стек на его уровень + 1
    stack[depth + 1] = node
    // Обрезаем всё что глубже
    stack.length = depth + 2
  }

  return root
}