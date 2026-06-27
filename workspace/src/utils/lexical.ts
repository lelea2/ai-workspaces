// Helpers for working with Lexical editor state JSON stored in section.body.
// Body may be either plain text (legacy / seed data) or Lexical JSON.

type LexicalNode = {
  type?: string
  text?: string
  tag?: string
  listType?: string
  children?: LexicalNode[]
}

export function isLexicalJson(body: string): boolean {
  return body.trimStart().startsWith('{"root"')
}

// Recursively extract plain text from a Lexical state JSON string.
// Used for word count, server-side suggestion validation, and display fallbacks.
export function extractPlainText(body: string): string {
  if (!body) return ''
  if (!isLexicalJson(body)) return body

  try {
    const state = JSON.parse(body) as { root: LexicalNode }

    function walk(node: LexicalNode): string {
      if (node.type === 'text') return node.text ?? ''
      const childText = (node.children ?? []).map(walk).join('')
      const isBlock = ['paragraph', 'heading', 'listitem', 'quote'].includes(node.type ?? '')
      return isBlock ? childText + '\n' : childText
    }

    return walk(state.root).trim()
  } catch {
    return body
  }
}

// Replace a text substring within Lexical JSON without losing surrounding
// node structure. Handles the common case where originalText lives inside a
// single text node. Cross-node spans (e.g., partially-bold text) are not
// handled — falls back to a plain-text replace of the extracted content.
export function lexicalReplaceText(body: string, originalText: string, suggestedText: string): string {
  if (!isLexicalJson(body)) return body.replace(originalText, suggestedText)

  try {
    const state = JSON.parse(body) as { root: LexicalNode }
    let replaced = false

    function walk(node: LexicalNode): void {
      if (replaced) return
      if (node.type === 'text' && typeof node.text === 'string' && node.text.includes(originalText)) {
        node.text = node.text.replace(originalText, suggestedText)
        replaced = true
        return
      }
      for (const child of node.children ?? []) walk(child)
    }

    walk(state.root)

    if (replaced) return JSON.stringify(state)

    // Fallback: convert to plain text, replace, and wrap in minimal Lexical JSON
    const plain = extractPlainText(body).replace(originalText, suggestedText)
    return plainTextToLexicalJson(plain)
  } catch {
    return body.replace(originalText, suggestedText)
  }
}

// Convert a plain text string to a minimal Lexical editor state JSON.
// Used when loading seed / template bodies into the Lexical editor.
export function plainTextToLexicalJson(text: string): string {
  const lines = text.split('\n')
  const children = lines.map((line) => ({
    children: line
      ? [{ detail: 0, format: 0, mode: 'normal', style: '', text: line, type: 'text', version: 1 }]
      : [],
    direction: 'ltr' as const,
    format: '',
    indent: 0,
    type: 'paragraph',
    version: 1,
  }))
  return JSON.stringify({
    root: {
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  })
}
