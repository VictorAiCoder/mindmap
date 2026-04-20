import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import DOMPurify from 'dompurify'
import { hljs } from './notes/hljsSetup'

// ============================================================================
// Настройка marked + подсветка через marked-highlight
// ============================================================================

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      try {
        return hljs.highlight(code, { language, ignoreIllegals: true }).value
      } catch {
        return hljs.highlight(code, { language: 'plaintext' }).value
      }
    },
  })
)

marked.setOptions({
  async: false,
  gfm: true,
  breaks: true,
})

// ============================================================================
// Настройка DOMPurify
// ============================================================================

// Разрешаем классы hljs (language-*, hljs-*) и target="_blank" на ссылках
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

const SANITIZE_CONFIG: DOMPurify.Config = {
  // Разрешённые теги — стандартный markdown + code/pre
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'em', 'del', 's', 'u',
    'ul', 'ol', 'li',
    'blockquote',
    'code', 'pre', 'span',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'input', // для чекбоксов GFM (task lists)
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title',
    'class',              // для hljs-классов
    'target', 'rel',
    'type', 'checked', 'disabled', // для чекбоксов
  ],
  // Запрещаем javascript: в ссылках/картинках
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel|data:image\/[a-z]+;base64):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
}

// ============================================================================
// Публичный API
// ============================================================================

export function renderMarkdown(text: string | null | undefined): string {
  if (!text) return ''
  const rawHtml = marked.parse(text) as string
  return DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG) as unknown as string
}

export function getNotesPreview(
  text: string | null | undefined,
  maxLines = 3,
  maxChars = 150
): string {
  if (!text) return ''

  const trimmed = text.trim()
  if (!trimmed) return ''

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