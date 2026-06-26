import type { Comment, Document, Section, Suggestion } from '../../types'

export interface ReviewResult {
  comments: Comment[]
  suggestions: Suggestion[]
}

export interface AIService {
  generateDraft(prompt: string): Promise<Section[]>
  reviewDocument(doc: Document, agentName: string): Promise<ReviewResult>
}
