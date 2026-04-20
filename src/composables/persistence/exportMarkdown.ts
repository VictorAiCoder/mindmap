// src/composables/persistence/exportMarkdown.ts
import type { MindMapNode } from '@/types/mindmap'

export function exportToMarkdown(root: MindMapNode): string {
  const lines: string[] = []
  renderNode(root, 1, lines)
  return lines.join('\n')
}

// ─── Internals ───────────────────────────────────────

const MAX_HEADING_LEVEL = 6
const DEFAULT_TITLE = 'Без названия'

function renderNode(
  node: MindMapNode,
  level: number,
  lines: string[]
): void {
  renderNodeHeader(node, level, lines)
  renderNodeBody(node, lines)

  for (const child of node.children) {
    lines.push('')
    renderNode(child, level + 1, lines)
  }
}

function renderNodeHeader(
  node: MindMapNode,
  level: number,
  lines: string[]
): void {
  const title = getNodeText(node)
  if (level <= MAX_HEADING_LEVEL) {
    lines.push(`${'#'.repeat(level)} ${title}`)
  } else {
    const indent = '  '.repeat(level - MAX_HEADING_LEVEL - 1)
    lines.push(`${indent}- ${title}`)
  }
}

function renderNodeBody(node: MindMapNode, lines: string[]): void {
  if (node.image) {
    lines.push('')
    lines.push(`![${escapeAlt(getNodeText(node))}](${node.image})`)
  }

  if (node.notes && node.notes.trim().length > 0) {
    lines.push('')
    lines.push(node.notes)
  }
}

/** Безопасно достаём text с фолбэком на случай порченых данных */
function getNodeText(node: MindMapNode): string {
  const t = node.text
  if (typeof t === 'string' && t.trim().length > 0) return t
  return DEFAULT_TITLE
}

/** Экранируем `]` в alt-тексте картинки */
function escapeAlt(text: string): string {
  return text.replace(/]/g, '\\]')
}