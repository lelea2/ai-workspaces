import type { Comment, Document, Section, Suggestion } from '../../types'

export interface DraftContext {
  documentId: string
  templateId?: string
  title: string
  sections: Section[]
}

export type AIRequestContext = DraftContext

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
  generateDraft(prompt: string, context?: AIRequestContext): Promise<Section[]>
  reviewDocument(doc: Document, agentName: string, context?: AIRequestContext): Promise<ReviewResult>
  applySuggestion(
    section: Section,
    suggestion: Suggestion,
    onChunk: (chunk: string) => void,
    context?: AIRequestContext,
  ): Promise<ApplySuggestionResult>
  fixComment(section: Section, comment: Comment, document: Document, context?: AIRequestContext): Promise<FixCommentResult>
}
