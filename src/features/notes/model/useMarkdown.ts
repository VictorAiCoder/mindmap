import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import DOMPurify from 'dompurify'
import { hljs } from './hljsSetup'
import type { Config } from 'dompurify'

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
    return `<pre><code class="language-mermaid">${token.text}</code></pre>`
  }
}

// ============================================================================
// Настройка marked + подсветка через marked-highlight
// ============================================================================

marked.use(
  { extensions: [mermaidExtension] },
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
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
  breaks: true,
})

// ============================================================================
// Настройка DOMPurify
// ============================================================================

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

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
    'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
    'd', 'x', 'y', 'width', 'height', 'rx', 'ry', 'transform', 'style',
    'id',
  ],
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel|data:image\/[a-z]+;base64):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
}

// ============================================================================
// Mermaid rendering
// ============================================================================

let mermaidInitialized = false
let idCounter = 0

/**
 * Post-process HTML to replace ```mermaid code blocks with rendered SVG.
 */
export async function renderMermaidInHtml(html: string): Promise<string> {
  if (!html.includes('language-mermaid')) return html

  if (!mermaidInitialized) {
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      fontFamily: "'JetBrains Mono', monospace",
      themeVariables: {
        primaryColor: '#141414',
        primaryTextColor: '#c8c8c8',
        primaryBorderColor: '#27b94b',
        lineColor: '#27b94b',
        fontSize: '14px',
        noteBkgColor: '#141414',
        noteTextColor: '#c8c8c8',
        noteBorderColor: '#27b94b',
        actorBkg: '#141414',
        actorTextColor: '#c8c8c8',
        actorBorder: '#27b94b',
        signalColor: '#c8c8c8',
        signalTextColor: '#c8c8c8',
      }
    })
    mermaidInitialized = true
  }

  const mermaid = (await import('mermaid')).default
  const blockRegex = /<pre><code class="language-mermaid">([^]*)<\/code><\/pre>/g

  const replacements: Array<{ original: string; replacement: string }> = []
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(html)) !== null) {
    const code = match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()

    try {
      const { svg } = await mermaid.render(`mermaid-${++idCounter}`, code)
      // Strip inline max-width from SVG — let CSS control sizing
      const cleanedSvg = svg.replace(/style="([^"]*?)max-width:\s*\d+px;?([^"]*?)"/g, 'style="$1$2"').replace(/style="\s*"/g, '')
      replacements.push({
        original: match[0],
        replacement: `<div class="mermaid">${cleanedSvg}</div>`
      })
    } catch {
      // Keep original code block on render error
    }
  }

  let result = html
  for (const { original, replacement } of replacements) {
    result = result.replace(original, replacement)
  }
  return result
}

// ============================================================================
// Публичный API
// ============================================================================

/**
 * Render markdown string to sanitized HTML.
 */
export function renderMarkdown(text: string | null | undefined): string {
  if (!text) return ''
  const rawHtml = marked.parse(text) as string
  return DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG) as unknown as string
}
