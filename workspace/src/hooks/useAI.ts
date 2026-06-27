import { getAIService } from '../services/ai'
import { useDocument } from './useDocument'

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

  return { generateDraft, runReview }
}
