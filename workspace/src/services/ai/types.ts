import type { Comment, Document, Section, Suggestion } from '../../types'

export interface DraftContext {
  documentId: string
  title: string
  sections: Section[]
}

export interface ReviewResult {
  comments: Comment[]
  suggestions: Suggestion[]
}

export interface ApplySuggestionResult {
  sectionId: string
  body: string
}

export interface FixCommentResult {
  originalText: string
  suggestedText: string
}

export interface AIService {
  generateDraft(prompt: string, context?: DraftContext): Promise<Section[]>
  reviewDocument(doc: Document, agentName: string): Promise<ReviewResult>
  applySuggestion(
    section: Section,
    suggestion: Suggestion,
    onChunk: (chunk: string) => void,
  ): Promise<ApplySuggestionResult>
  fixComment(section: Section, comment: Comment, document: Document): Promise<FixCommentResult>
}
