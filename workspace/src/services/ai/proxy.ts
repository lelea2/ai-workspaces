import type { Comment, Document, Section, Suggestion } from '../../types'
import type { AIService, ReviewResult, ApplySuggestionResult, FixCommentResult } from './types'

export class ProxyAIService implements AIService {
  async generateDraft(prompt: string): Promise<Section[]> {
    const res = await fetch('/api/ai/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
      throw new Error(body.error ?? 'Draft generation failed')
    }
    return res.json() as Promise<Section[]>
  }

  async reviewDocument(doc: Document, agentName: string): Promise<ReviewResult> {
    const res = await fetch('/api/ai/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: doc, agentName }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
      throw new Error(body.error ?? 'Review failed')
    }
    return res.json() as Promise<ReviewResult>
  }

  async applySuggestion(
    section: Section,
    suggestion: Suggestion,
    onChunk: (chunk: string) => void,
  ): Promise<ApplySuggestionResult> {
    const res = await fetch('/api/ai/apply-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, suggestion }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
      throw new Error(err.error ?? 'Apply suggestion failed')
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      // Process complete SSE lines
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data) as { chunk?: string }
          if (parsed.chunk) {
            accumulated += parsed.chunk
            onChunk(parsed.chunk)
          }
        } catch { /* skip malformed frames */ }
      }
    }

    return { sectionId: section.id, body: accumulated }
  }

  async fixComment(section: Section, comment: Comment, document: Document): Promise<FixCommentResult> {
    const res = await fetch('/api/ai/fix-comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section,
        comment,
        document: { title: document.title, sections: document.sections },
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
      throw new Error(err.error ?? 'Fix comment failed')
    }
    return res.json() as Promise<FixCommentResult>
  }
}
