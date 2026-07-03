import { getAIService } from '../services/ai'
import { useDocument } from './useDocument'
import { useUser } from '../store/UserContext'
import { extractPlainText, isLexicalJson, plainTextToLexicalJson } from '../utils/lexical'
import type { Comment, Suggestion } from '../types'

export function useAI() {
  const { activeDocument, dispatch } = useDocument()
  const { currentUser } = useUser()
  const actor = currentUser ?? undefined

  async function generateDraft(prompt: string) {
    if (!activeDocument) return
    dispatch({ type: 'GENERATE_DRAFT_START', docId: activeDocument.id })
    try {
      const sections = await getAIService().generateDraft(prompt)
      dispatch({ type: 'GENERATE_DRAFT_SUCCESS', docId: activeDocument.id, sections })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Draft generation failed.'
      dispatch({ type: 'AI_ERROR', docId: activeDocument.id, error })
    }
  }

  async function runReview(agentName: string) {
    if (!activeDocument) return
    dispatch({ type: 'RUN_REVIEW_START', docId: activeDocument.id })
    try {
      const result = await getAIService().reviewDocument(activeDocument, agentName)
      dispatch({ type: 'RUN_REVIEW_SUCCESS', docId: activeDocument.id, ...result })
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Review failed.'
      dispatch({ type: 'AI_ERROR', docId: activeDocument.id, error })
    }
  }

  // Stream the AI rewrite, return the resulting body — does NOT dispatch.
  // Call applyAcceptedSuggestion after user approves the diff.
  async function acceptSuggestion(
    suggestion: Suggestion,
    onChunk?: (chunk: string) => void,
  ): Promise<string | undefined> {
    if (!activeDocument) return undefined
    const section = activeDocument.sections.find((s) => s.id === suggestion.sectionId)
    if (!section) return undefined
    try {
      const result = await getAIService().applySuggestion(
        section,
        suggestion,
        onChunk ?? (() => {}),
      )
      return result.body || undefined
    } catch {
      return undefined
    }
  }

  // Apply an already-approved AI body to the document (dispatches ACCEPT_SUGGESTION).
  function applyAcceptedSuggestion(suggestion: Suggestion, aiBody?: string) {
    if (!activeDocument) return
    dispatch({ type: 'ACCEPT_SUGGESTION', docId: activeDocument.id, suggestionId: suggestion.id, aiBody, actor })
  }

  // Step 1 of "Fix by Agent": call fix-comment to identify the span, then stream
  // the polished body via apply-suggestion SSE. Returns { sectionId, originalBody,
  // aiBody } so the caller can show a diff before committing anything.
  async function fixCommentByAgent(
    comment: Comment,
    onChunk: (chunk: string) => void,
  ): Promise<{ sectionId: string; originalBody: string; aiBody: string } | undefined> {
    if (!activeDocument) return undefined
    const section = activeDocument.sections.find((s) => s.id === comment.sectionId)
    if (!section) return undefined
    const originalBody = extractPlainText(section.body)
    try {
      const fix = await getAIService().fixComment(section, comment, activeDocument)
      const syntheticSuggestion: Suggestion = {
        id: `comment-fix-${comment.id}`,
        sectionId: comment.sectionId,
        sectionTitle: section.heading,
        originalText: fix.originalText,
        suggestedText: fix.suggestedText,
        reason: comment.text,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      const result = await getAIService().applySuggestion(section, syntheticSuggestion, onChunk)
      return result.body ? { sectionId: comment.sectionId, originalBody, aiBody: result.body } : undefined
    } catch {
      return undefined
    }
  }

  // Step 2: commit an approved comment fix to the document and resolve the comment.
  function applyCommentFix(comment: Comment, sectionId: string, aiBody: string) {
    if (!activeDocument) return
    const section = activeDocument.sections.find((s) => s.id === sectionId)
    if (!section) return
    const newBody = isLexicalJson(section.body) ? plainTextToLexicalJson(aiBody) : aiBody
    dispatch({ type: 'EDIT_SECTION', docId: activeDocument.id, sectionId, body: newBody, actor })
    dispatch({ type: 'RESOLVE_COMMENT', docId: activeDocument.id, commentId: comment.id, actor })
  }

  return { generateDraft, runReview, acceptSuggestion, applyAcceptedSuggestion, fixCommentByAgent, applyCommentFix }
}
