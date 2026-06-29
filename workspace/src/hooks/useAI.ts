import { getAIService } from '../services/ai'
import { useDocument } from './useDocument'
import type { Suggestion } from '../types'

export function useAI() {
  const { activeDocument, dispatch } = useDocument()

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
    dispatch({ type: 'ACCEPT_SUGGESTION', docId: activeDocument.id, suggestionId: suggestion.id, aiBody })
  }

  return { generateDraft, runReview, acceptSuggestion, applyAcceptedSuggestion }
}
