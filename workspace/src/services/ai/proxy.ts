import type { Document, Section } from '../../types'
import type { AIService, ReviewResult } from './types'

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
}
