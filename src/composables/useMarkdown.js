// src/composables/useMarkdown.js
import { marked } from 'marked'
import { NOTE_MAX_PREVIEW_LINES } from '../constants'

marked.setOptions({ breaks: true, gfm: true })

export function renderMarkdown(text) {
  if (!text) return ''
  return marked.parse(text)
}

export function getNotesPreview(text, maxLines = NOTE_MAX_PREVIEW_LINES, maxChars = 400) {
  if (!text) return ''

  const lines = text.split('\n')
  const preview = lines.slice(0, maxLines).join('\n')

  if (preview.length > maxChars) return preview.slice(0, maxChars) + '…'
  if (lines.length > maxLines) return preview + '\n…'

  return preview
}