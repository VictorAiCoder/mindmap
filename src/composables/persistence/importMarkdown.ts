import type { MindMapNode } from '@/types/mindmap'
import { createNode } from '../tree/useNodeFactory'

// ============================================================================
// Типы
// ============================================================================

interface ParsedSection {
  level: number          // уровень заголовка (1 = #, 2 = ##, ...)
  title: string          // текст заголовка (локальное имя парсера)
  content: string[]      // строки между этим заголовком и следующим
}

interface NodeWithLevel {
  node: MindMapNode
  level: number
}

// ============================================================================
// Регулярки
// ============================================================================

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/
const IMAGE_ONLY_LINE_RE = /^\s*!\[[^\]]*\]\([^)]+\)\s*$/
const IMAGE_URL_RE = /!\[[^\]]*\]\(([^)\s]+)\)/

// ============================================================================
// Хелперы
// ============================================================================

function isImageOnlyLine(line: string): boolean {
  return IMAGE_ONLY_LINE_RE.test(line)
}

function extractImageUrl(line: string): string | null {
  const match = line.match(IMAGE_URL_RE)
  return match?.[1] ?? null
}

function parseHeading(line: string): { level: number; title: string } | null {
  const match = line.match(HEADING_RE)
  if (!match) return null
  const hashes = match[1]
  const title = match[2]
  if (!hashes || !title) return null
  return { level: hashes.length, title }
}

// ============================================================================
// Разбор markdown на секции
// ============================================================================

function splitIntoSections(markdown: string): ParsedSection[] {
  const lines = markdown.split(/\r?\n/)
  const sections: ParsedSection[] = []
  let current: ParsedSection | null = null

  for (const line of lines) {
    const heading = parseHeading(line)
    if (heading) {
      if (current) sections.push(current)
      current = { level: heading.level, title: heading.title, content: [] }
    } else if (current) {
      current.content.push(line)
    }
    // строки до первого заголовка игнорируем
  }
  if (current) sections.push(current)

  return sections
}

// ============================================================================
// Преобразование секции в узел
// ============================================================================

function sectionToNode(section: ParsedSection): MindMapNode {
  let image: string | undefined
  const notesLines: string[] = []

  for (const line of section.content) {
    if (!image && isImageOnlyLine(line)) {
      const url = extractImageUrl(line)
      if (url) {
        image = url
        continue
      }
    }
    notesLines.push(line)
  }

  const notes = notesLines.join('\n').trim()

  return createNode({
    text: section.title,              // ✅ маппинг: section.title → node.text
    notes: notes || undefined,
    image,
  })
}

// ============================================================================
// Сборка дерева из плоского списка секций по уровням заголовков
// ============================================================================

function buildTree(nodes: NodeWithLevel[]): MindMapNode {
  const root = nodes[0]
  if (!root) {
    throw new Error('buildTree: cannot build tree from empty node list')
  }

  const stack: NodeWithLevel[] = [root]

  for (let i = 1; i < nodes.length; i++) {
    const current = nodes[i]
    if (!current) continue  // для noUncheckedIndexedAccess

    // Сворачиваем стек, пока верхний элемент не на более высоком уровне
    while (stack.length > 0 && stack[stack.length - 1]!.level >= current.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      // Заголовок того же уровня что и корень — цепляем к корню, чтобы не потерять
      console.warn(
        `[importMarkdown] Заголовок "${current.node.text}" (уровень ${current.level}) ` +
        `конкурирует с корнем. Добавлен как потомок корня.`
      )
      root.node.children.push(current.node)
      stack.push(root, current)
      continue
    }

    const parent = stack[stack.length - 1]!
    parent.node.children.push(current.node)
    stack.push(current)
  }

  return root.node
}

// ============================================================================
// Публичный API
// ============================================================================

export function parseMarkdownToTree(markdown: string): MindMapNode | null {
  const sections = splitIntoSections(markdown)
  if (sections.length === 0) return null

  const nodes: NodeWithLevel[] = sections.map((section) => ({
    node: sectionToNode(section),
    level: section.level,
  }))

  return buildTree(nodes)
}