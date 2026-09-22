/**
 * Mermaid integration for mindmap notes.
 *
 * Provides lazy initialization and post-render replacement of
 * ```mermaid fenced code blocks in HTML output from marked.
 *
 * Usage:
 *   import { renderMermaidInHtml } from '../lib/mermaid'
 *   const html = await renderMermaidInHtml(markedHtml)
 */

let initialized = false

async function ensureMermaid() {
  if (initialized) return
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
  initialized = true
}

let idCounter = 0

/**
 * Find ```mermaid code blocks in HTML and replace with rendered SVG.
 *
 * marked outputs: <pre><code class="language-mermaid">...</code></pre>
 * This function replaces each with: <div class="mermaid">SVG</div>
 */
export async function renderMermaidInHtml(html: string): Promise<string> {
  // Check if there are any mermaid blocks
  if (!html.includes('language-mermaid')) return html

  await ensureMermaid()
  const mermaid = (await import('mermaid')).default

  // Regex matches <pre><code class="language-mermaid">content</code></pre>
  // Uses [^] instead of . to match newlines
  const blockRegex = /<pre><code class="language-mermaid">([^]*)<\/code><\/pre>/g

  const replacements: Array<{ original: string; replacement: string }> = []
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(html)) !== null) {
    const original = match[0]
    const code = match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()

    const id = `mermaid-${++idCounter}`
    try {
      const { svg } = await mermaid.render(id, code)
      // Strip inline max-width from SVG — let CSS control sizing
      const cleanedSvg = svg.replace(/style="([^"]*?)max-width:\s*\d+px;?([^"]*?)"/g, 'style="$1$2"').replace(/style="\s*"/g, '')
      replacements.push({
        original,
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
