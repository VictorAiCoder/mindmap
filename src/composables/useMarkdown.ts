import { marked } from 'marked'

// ============================================================================
// Настройка marked
// ============================================================================

// Глобальная конфигурация: синхронный парсинг, GFM (таблицы, чеклисты, ~~зачёркивание~~)
marked.setOptions({
  async: false,
  gfm: true,
  breaks: true, // перенос строки = <br> (привычное поведение для заметок)
})

// ============================================================================
// Публичный API
// ============================================================================

/**
 * Рендерит markdown-текст в HTML.
 * Возвращает пустую строку для falsy-входа.
 */
export function renderMarkdown(text: string | null | undefined): string {
  if (!text) return ''
  // marked.parse с async:false гарантированно возвращает string,
  // но в типах union — поэтому каст.
  return marked.parse(text) as string
}

/**
 * Превью заметки: обрезает по количеству строк и символов.
 * Возвращает plain text (без markdown-разметки не парсим — это превью).
 */
export function getNotesPreview(
  text: string | null | undefined,
  maxLines = 3,
  maxChars = 150
): string {
  if (!text) return ''

  const trimmed = text.trim()
  if (!trimmed) return ''

  // Берём первые N непустых строк
  const lines = trimmed
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, maxLines)

  let preview = lines.join(' ')

  if (preview.length > maxChars) {
    preview = preview.slice(0, maxChars).trimEnd() + '…'
  }

  return preview
}