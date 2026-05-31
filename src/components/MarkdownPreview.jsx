/**
 * MarkdownPreview.jsx — Simple markdown renderer for Note items.
 *
 * Supports a practical subset of Markdown:
 *   - **bold**, *italic*, ~~strikethrough~~, `inline code`
 *   - # headings (h1–h3)
 *   - [links](url)
 *   - Unordered lists (- or *)
 *   - Ordered lists (1.)
 *   - > blockquotes
 *   - ``` fenced code blocks ```
 *   - --- horizontal rules
 *   - Line breaks (double newline → paragraph)
 *
 * No external dependencies — pure regex-based parsing.
 */

/**
 * Convert a markdown string to sanitised HTML.
 * Escapes raw HTML first to prevent XSS, then applies markdown patterns.
 *
 * @param {string} md — Raw markdown text
 * @returns {string}   — HTML string safe for dangerouslySetInnerHTML
 */
function markdownToHtml(md) {
  if (!md) return ''

  // 1. Escape HTML entities to prevent XSS
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 2. Fenced code blocks (``` ... ```)
  html = html.replace(/```([\s\S]*?)```/g, (_, code) =>
    `<pre class="md-code-block"><code>${code.trim()}</code></pre>`
  )

  // 3. Process line by line for block-level elements
  const lines = html.split('\n')
  const processed = []
  let inList = false
  let listType = null // 'ul' or 'ol'

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Skip lines inside code blocks (already handled)
    if (line.includes('<pre class="md-code-block">') || line.includes('</pre>')) {
      if (inList) { processed.push(`</${listType}>`); inList = false }
      processed.push(line)
      continue
    }

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      if (inList) { processed.push(`</${listType}>`); inList = false }
      processed.push('<hr class="md-hr" />')
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      if (inList) { processed.push(`</${listType}>`); inList = false }
      const level = headingMatch[1].length
      processed.push(`<h${level} class="md-h${level}">${applyInline(headingMatch[2])}</h${level}>`)
      continue
    }

    // Blockquote
    if (line.match(/^&gt;\s?(.*)$/)) {
      if (inList) { processed.push(`</${listType}>`); inList = false }
      const quoteText = line.replace(/^&gt;\s?/, '')
      processed.push(`<blockquote class="md-blockquote">${applyInline(quoteText)}</blockquote>`)
      continue
    }

    // Unordered list item
    const ulMatch = line.match(/^[\s]*[-*]\s+(.+)/)
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processed.push(`</${listType}>`)
        processed.push('<ul class="md-ul">')
        inList = true
        listType = 'ul'
      }
      processed.push(`<li>${applyInline(ulMatch[1])}</li>`)
      continue
    }

    // Ordered list item
    const olMatch = line.match(/^[\s]*\d+\.\s+(.+)/)
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processed.push(`</${listType}>`)
        processed.push('<ol class="md-ol">')
        inList = true
        listType = 'ol'
      }
      processed.push(`<li>${applyInline(olMatch[1])}</li>`)
      continue
    }

    // Close any open list
    if (inList) { processed.push(`</${listType}>`); inList = false }

    // Empty line → break
    if (line.trim() === '') {
      processed.push('<br />')
      continue
    }

    // Normal paragraph
    processed.push(`<p class="md-p">${applyInline(line)}</p>`)
  }

  // Close any trailing open list
  if (inList) processed.push(`</${listType}>`)

  return processed.join('\n')
}

/**
 * Apply inline markdown formatting to a single line.
 * Order matters — more specific patterns first.
 */
function applyInline(text) {
  return text
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      // Prevent execution of malicious URIs (XSS mitigation)
      const sanitizedUrl = /^(javascript|vbscript|data):/i.test(url.trim()) ? '#' : url
      return `<a href="${sanitizedUrl}" target="_blank" rel="noopener noreferrer" class="md-link">${text}</a>`
    })
}

/**
 * MarkdownPreview component.
 * Renders raw markdown text as formatted HTML with themed styles.
 *
 * @param {{ text: string }} props
 */
export default function MarkdownPreview({ text }) {
  const html = markdownToHtml(text)

  return (
    <div
      className="md-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
