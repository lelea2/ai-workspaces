import type { Section } from '../types'
import { isLexicalJson } from './lexical'

// ── Shared node type ──────────────────────────────────────────────────────────

type LexNode = {
  type?: string
  text?: string
  format?: number   // bitmask: bold=1, italic=2, strikethrough=4, underline=8, code=16
  tag?: string      // heading tag: h1–h6
  listType?: string // 'bullet' | 'number'
  url?: string      // link href
  value?: number    // ordered list item index
  children?: LexNode[]
}

// ── Markdown export ───────────────────────────────────────────────────────────

function inlineToMd(node: LexNode): string {
  if (node.type === 'text') {
    const t = node.text ?? ''
    const fmt = node.format ?? 0
    if ((fmt & 16) !== 0) return `\`${t}\``                       // inline code
    const bold = (fmt & 1) !== 0
    const italic = (fmt & 2) !== 0
    if (bold && italic) return `***${t}***`
    if (bold) return `**${t}**`
    if (italic) return `*${t}*`
    if ((fmt & 4) !== 0) return `~~${t}~~`                        // strikethrough
    return t
  }
  if (node.type === 'link') {
    const inner = (node.children ?? []).map(inlineToMd).join('')
    return `[${inner}](${node.url ?? ''})`
  }
  if (node.type === 'linebreak') return '\n'
  return (node.children ?? []).map(inlineToMd).join('')
}

function blockToMd(node: LexNode, listDepth = 0): string {
  const type = node.type ?? ''

  if (type === 'paragraph') {
    const inner = (node.children ?? []).map(inlineToMd).join('')
    return inner.trim() ? inner + '\n' : '\n'
  }

  if (type === 'heading') {
    const prefix = { h1: '#', h2: '##', h3: '###', h4: '####', h5: '#####', h6: '######' }[node.tag ?? 'h1'] ?? '#'
    const inner = (node.children ?? []).map(inlineToMd).join('')
    return `${prefix} ${inner}\n`
  }

  if (type === 'list') {
    const ordered = node.listType === 'number'
    const indent = '  '.repeat(listDepth)
    return (node.children ?? []).map((item, i) => {
      const prefix = ordered ? `${item.value ?? i + 1}.` : '-'
      const parts = (item.children ?? []).map((child) =>
        child.type === 'list'
          ? '\n' + blockToMd(child, listDepth + 1).trimEnd()
          : inlineToMd(child),
      )
      return `${indent}${prefix} ${parts.join('').trim()}`
    }).join('\n') + '\n'
  }

  if (type === 'code') {
    const codeText = (node.children ?? []).map((c) => c.text ?? '').join('')
    return `\`\`\`\n${codeText}\n\`\`\`\n`
  }

  if (type === 'quote') {
    const inner = (node.children ?? []).map(inlineToMd).join('')
    return `> ${inner}\n`
  }

  // root / unknown container
  return (node.children ?? []).map((c) => blockToMd(c)).join('\n')
}

function bodyToMarkdown(body: string): string {
  if (!isLexicalJson(body)) return body.trim()
  try {
    const state = JSON.parse(body) as { root: LexNode }
    return (state.root.children ?? []).map((c) => blockToMd(c)).join('\n').trim()
  } catch {
    return body.trim()
  }
}

export function exportAsMarkdown(title: string, sections: Section[]): void {
  const lines: string[] = [`# ${title}`, '']
  for (const section of sections) {
    lines.push(`## ${section.heading}`, '', bodyToMarkdown(section.body), '')
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown; charset=utf-8' })
  triggerDownload(blob, `${slugify(title)}.md`)
}

// ── HTML / PDF export ─────────────────────────────────────────────────────────

function inlineToHtml(node: LexNode): string {
  if (node.type === 'text') {
    const t = escHtml(node.text ?? '')
    const fmt = node.format ?? 0
    let out = t
    if ((fmt & 16) !== 0) out = `<code>${out}</code>`
    if ((fmt & 4) !== 0) out = `<del>${out}</del>`
    if ((fmt & 8) !== 0) out = `<u>${out}</u>`
    if ((fmt & 2) !== 0) out = `<em>${out}</em>`
    if ((fmt & 1) !== 0) out = `<strong>${out}</strong>`
    return out
  }
  if (node.type === 'link') {
    const inner = (node.children ?? []).map(inlineToHtml).join('')
    return `<a href="${escHtml(node.url ?? '')}">${inner}</a>`
  }
  if (node.type === 'linebreak') return '<br>'
  return (node.children ?? []).map(inlineToHtml).join('')
}

function blockToHtml(node: LexNode): string {
  const type = node.type ?? ''

  if (type === 'paragraph') {
    const inner = (node.children ?? []).map(inlineToHtml).join('')
    return inner.trim() ? `<p>${inner}</p>` : '<p>&nbsp;</p>'
  }

  if (type === 'heading') {
    const tag = node.tag ?? 'h2'
    return `<${tag}>${(node.children ?? []).map(inlineToHtml).join('')}</${tag}>`
  }

  if (type === 'list') {
    const tag = node.listType === 'number' ? 'ol' : 'ul'
    const items = (node.children ?? []).map((item) => {
      const inner = (item.children ?? []).map((c) =>
        c.type === 'list' ? blockToHtml(c) : inlineToHtml(c),
      ).join('')
      return `<li>${inner}</li>`
    }).join('')
    return `<${tag}>${items}</${tag}>`
  }

  if (type === 'code') {
    const codeText = (node.children ?? []).map((c) => escHtml(c.text ?? '')).join('')
    return `<pre><code>${codeText}</code></pre>`
  }

  if (type === 'quote') {
    const inner = (node.children ?? []).map(inlineToHtml).join('')
    return `<blockquote>${inner}</blockquote>`
  }

  return (node.children ?? []).map(blockToHtml).join('')
}

function bodyToHtml(body: string): string {
  if (!isLexicalJson(body)) {
    return body.split('\n').map((l) => `<p>${escHtml(l) || '&nbsp;'}</p>`).join('')
  }
  try {
    const state = JSON.parse(body) as { root: LexNode }
    return (state.root.children ?? []).map(blockToHtml).join('\n')
  } catch {
    return `<p>${escHtml(body)}</p>`
  }
}

export function exportAsPDF(title: string, sections: Section[]): void {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const sectionsHtml = sections.map((s) => `
    <section>
      <h2 class="sec-heading">${escHtml(s.heading)}</h2>
      ${bodyToHtml(s.body)}
    </section>`).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.65;
      color: #111827;
      padding: 2.5cm 3cm;
      max-width: 21cm;
      margin: 0 auto;
    }
    h1 { font-size: 22pt; font-weight: 700; margin-bottom: 4pt; }
    h2 { font-size: 14pt; font-weight: 600; margin: 16pt 0 4pt; }
    h3 { font-size: 12pt; font-weight: 600; margin: 12pt 0 3pt; }
    .sec-heading {
      font-size: 15pt; font-weight: 700; color: #1e3a5f;
      border-bottom: 1.5pt solid #e5e7eb; padding-bottom: 5pt;
      margin: 28pt 0 10pt;
    }
    .doc-meta { font-size: 9pt; color: #9ca3af; margin: 4pt 0 24pt; }
    p { margin-bottom: 7pt; }
    ul { list-style: disc; margin: 0 0 7pt 18pt; }
    ol { list-style: decimal; margin: 0 0 7pt 18pt; }
    li { margin-bottom: 2pt; }
    a { color: #2563eb; text-decoration: underline; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    del { text-decoration: line-through; color: #6b7280; }
    u { text-decoration: underline; }
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 9.5pt; background: #f3f4f6;
      padding: 1pt 4pt; border-radius: 3pt;
    }
    pre {
      background: #1e293b; color: #e2e8f0;
      padding: 10pt 12pt; border-radius: 6pt;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 9pt; white-space: pre-wrap;
      margin-bottom: 10pt; overflow-wrap: break-word;
    }
    pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
    blockquote {
      border-left: 3pt solid #d1d5db; padding-left: 12pt;
      color: #6b7280; margin-bottom: 8pt; font-style: italic;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 2cm 2.5cm; size: A4; }
      .sec-heading { page-break-before: auto; }
      section { page-break-inside: avoid; }
      pre { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${escHtml(title)}</h1>
  <p class="doc-meta">Exported ${date} · AI Doc Workspace</p>
  ${sectionsHtml}
  <script>window.addEventListener('load', () => { window.print(); });<\/script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=860,height=700')
  if (!win) {
    // If popup was blocked, fall back to a data-URI download
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
    triggerDownload(blob, `${slugify(title)}.html`)
    return
  }
  win.document.write(html)
  win.document.close()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'document'
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
