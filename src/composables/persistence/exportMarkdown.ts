// src/composables/persistence/exportMarkdown.ts
import type { MindMapNode } from '@/types/mindmap'
import type { ImageStorageApi } from '@/types/mindmap-api'

/**
 * ★ ИЗМЕНЕНО: добавлен imageStorage для резолва imageId → dataUrl.
 *
 * ⚠️ Для ImageSegment экспортируется dataUrl исходника целиком (clip игнорируется).
 *    Это "lossy" экспорт — семантика сегмента теряется, но сам снимок
 *    остаётся в markdown. Решим в Коммите 3 (рендер сегмента в canvas → dataUrl).
 */
export function exportToMarkdown(
  root: MindMapNode,
  imageStorage: ImageStorageApi
): string {
  const lines: string[] = []
  renderNode(root, 1, lines, imageStorage)
  return lines.join('\n')
}

// ─── Internals ───────────────────────────────────────

const MAX_HEADING_LEVEL = 6
const DEFAULT_TITLE = 'Без названия'

function renderNode(
  node: MindMapNode,
  level: number,
  lines: string[],
  imageStorage: ImageStorageApi
): void {
  renderNodeHeader(node, level, lines)
  renderNodeBody(node, lines, imageStorage)

  for (const child of node.children) {
    lines.push('')
    renderNode(child, level + 1, lines, imageStorage)
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
  // ★ БЫЛО: if (node.image) { ... node.image ... }
  // ★ СТАЛО: резолв через пул
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