import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import DOMPurify from 'dompurify'
import type { Config } from 'dompurify'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import markdown from 'highlight.js/lib/languages/markdown'

let configured = false

// ============================================================================
// Mermaid extension — intercepts ```mermaid blocks before hljs
// ============================================================================

const mermaidExtension = {
  name: 'mermaid',
  level: 'block' as const,
  start(src: string) { return src.match(/^```mermaid/m)?.index },
  tokenizer(src: string) {
    const match = src.match(/^```mermaid\n([\s\S]*?)^```/m)
    if (match) {
      return {
        type: 'mermaid',
        raw: match[0],
        text: match[1].trim()
      }
    }
  },
  renderer(token: any) {
    // Output a marker that renderMermaidInHtml will find
    return `<pre><code class="language-mermaid">${token.text}</code></pre>`
  }
}

// ============================================================================
// Configuration (call once before first render)
// ============================================================================

export function configureMarkdown(): void {
  if (configured) return
  configured = true

  hljs.registerLanguage('javascript', javascript)
  hljs.registerLanguage('typescript', typescript)
  hljs.registerLanguage('xml', xml)
  hljs.registerLanguage('bash', bash)
  hljs.registerLanguage('markdown', markdown)

  marked.use(
    { extensions: [mermaidExtension] },
    markedHighlight({
      langPrefix: 'hljs language-',
      highlight(code: string, lang: string) {
        // Skip mermaid blocks — they're handled by renderMermaidInHtml
        if (lang === 'mermaid') return code
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
    breaks: false,
  })

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
}

// ============================================================================
// Sanitize config — allow <div> for mermaid SVG containers
// ============================================================================

const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'em', 'del', 's', 'u',
    'ul', 'ol', 'li',
    'blockquote',
    'code', 'pre', 'span',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'input',
    'div', // mermaid SVG container
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title',
    'class',
    'target', 'rel',
    'type', 'checked', 'disabled',
    'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', // SVG
    'd', 'x', 'y', 'width', 'height', 'rx', 'ry', 'transform', 'style',
    'id',
  ],
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel|data:image\/[a-z]+;base64):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Render markdown string to sanitized HTML.
 * Calls configureMarkdown() lazily on first invocation.
 */
export function renderMarkdown(source: string): string {
  configureMarkdown()
  const rawHtml = marked.parse(source) as string
  return DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG) as unknown as string
}
