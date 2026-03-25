// src/composables/useMarkdown.js
import { marked } from 'marked'

// Настраиваем marked
marked.setOptions({
  breaks: true,       // переносы строк как <br>
  gfm: true           // GitHub Flavored Markdown
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
export function getNotesPreview(text, maxLines = 3, maxChars = 120) {
  if (!text) return ''

  const lines = text.split('\n').filter(l => l.trim())
  const preview = lines.slice(0, maxLines).join('\n')

  if (preview.length > maxChars) {
    return preview.slice(0, maxChars) + '…'
  }

  if (lines.length > maxLines) {
    return preview + '…'
  }

  return preview
}