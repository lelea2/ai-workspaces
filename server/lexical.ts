// Server-side helpers for Lexical editor state JSON.
// No browser dependencies — safe to import in Express routes.

type LexicalNode = {
  type?: string
  text?: string
  children?: LexicalNode[]
}

export function isLexicalJson(body: string): boolean {
  return body.trimStart().startsWith('{"root"')
}

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
