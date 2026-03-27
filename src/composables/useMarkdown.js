// src/composables/useMarkdown.js
import { marked } from 'marked'

marked.setOptions({
  breaks: true,
  gfm: true
})

/**
 * Рендерит markdown в HTML
 */
export function renderMarkdown(text) {
  if (!text) return ''
  return marked.parse(text)
}

/**
 * Извлекает первые N строк текста для превью
 */
export function getNotesPreview(text, maxLines = 7, maxChars = 300) {
  if (!text) return ''

  const lines = text.split('\n')
  const preview = lines.slice(0, maxLines).join('\n')

  if (preview.length > maxChars) {
    return preview.slice(0, maxChars) + '…'
  }

  if (lines.length > maxLines) {
    return preview + '\n…'
  }

  return preview
}