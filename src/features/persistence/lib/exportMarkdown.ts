// src/composables/persistence/exportMarkdown.ts
import type { MindMapNode } from '@entities/node'
import type { ImageStorageApi } from '../../../embed/types/image-storage'

/**
 * Экспорт дерева mindmap в markdown.
 *
 * @param root Корневой узел дерева
 * @param imageStorage Пул картинок для резолва imageId → dataUrl
 * @param hiddenSections Тексты узлов, которые нужно исключить из экспорта
 *                        (скрытые секции — не попадают в markdown)
 */
export function exportToMarkdown(
  root: MindMapNode,
  imageStorage: ImageStorageApi,
  hiddenSections?: string[]
): string {
  const hidden = new Set(hiddenSections ?? [])
  const lines: string[] = []
  renderNode(root, 1, lines, imageStorage, hidden)
  return lines.join('\n')
}

// ─── Internals ───────────────────────────────────────

const MAX_HEADING_LEVEL = 6
const DEFAULT_TITLE = 'Без названия'

function renderNode(
  node: MindMapNode,
  level: number,
  lines: string[],
  imageStorage: ImageStorageApi,
  hidden: Set<string>
): void {
  // Пропуск скрытых секций — узел и все его потомки не попадают в markdown
  if (hidden.has(node.text)) return

  renderNodeHeader(node, level, lines)
  renderNodeBody(node, lines, imageStorage)

  for (const child of node.children) {
    lines.push('')
    renderNode(child, level + 1, lines, imageStorage, hidden)
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

function renderNodeBody(
  node: MindMapNode,
  lines: string[],
  imageStorage: ImageStorageApi
): void {
  const resolved = imageStorage.resolve(node.imageId)
  if (resolved) {
    lines.push('')
    lines.push(`![${escapeAlt(getNodeText(node))}](${resolved.dataUrl})`)
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