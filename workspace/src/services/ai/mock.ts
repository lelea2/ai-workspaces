import type { Comment, Document, Section, Suggestion } from '../../types'
import type { AIService, ApplySuggestionResult, FixCommentResult, ReviewResult, AIRequestContext } from './types'
import { extractPlainText } from '../../utils/lexical'

const AGENT_STYLE: Record<string, { color: string }> = {
  'Drafting Agent': { color: '#10b981' },
  'Reviewer Agent': { color: '#3b82f6' },
  'Security Agent': { color: '#ef4444' },
  'Clarity Agent': { color: '#8b5cf6' },
  'Technical Risk Agent': { color: '#f59e0b' },
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function firstLine(body: string): string {
  const line = body.split('\n')[0].trim()
  return line.length > 8 ? line : body.substring(0, 80).trim()
}

function hintForSection(section: Section): { reason: string; addition: string } {
  const h = section.heading.toLowerCase()
  if (h.includes('goal') || h.includes('objective')) {
    return {
      reason: 'Success metrics should be specific and measurable with clear numeric targets.',
      addition: '\n\nSuccess metrics: [define KPIs, numeric targets, and measurement timeline].',
    }
  }
  if (h.includes('risk')) {
    return {
      reason: 'Each risk should have a concrete owner and mitigation plan with a review cadence.',
      addition: '\n\nRisk owner: [team/person]. Review cadence: [weekly/bi-weekly].',
    }
  }
  if (h.includes('architect') || h.includes('solution') || h.includes('design')) {
    return {
      reason: 'Clarify component boundaries and data flow direction.',
      addition: ' Include a sequence diagram for the primary request path.',
    }
  }
  if (h.includes('problem') || h.includes('background') || h.includes('context')) {
    return {
      reason: 'Quantify the impact of the problem with concrete numbers.',
      addition: ' This affects [N users/teams] and costs approximately [X hours/dollars] per [week/month].',
    }
  }
  return {
    reason: 'Add specific details, examples, or references to strengthen this section.',
    addition: '\n\n[Add supporting evidence, examples, or links here.]',
  }
}

function commentForSection(section: Section): string {
  const h = section.heading.toLowerCase()
  if (h.includes('goal') || h.includes('objective')) {
    return 'The goals section would benefit from SMART criteria — make each goal Specific, Measurable, Achievable, Relevant, and Time-bound.'
  }
  if (h.includes('risk')) {
    return 'Consider adding a risk likelihood × impact matrix to help readers quickly triage the most critical items.'
  }
  if (h.includes('architect') || h.includes('solution')) {
    return 'The architecture is clear. A numbered step-walkthrough of a typical request flow would help readers trace end-to-end behaviour.'
  }
  return 'Consider adding concrete examples or references to strengthen this section\'s credibility.'
}

export class MockAIService implements AIService {
  async generateDraft(prompt: string, context?: AIRequestContext): Promise<Section[]> {
    await sleep(900)
    if (context?.sections?.length) {
      return context.sections.map((section) => ({
        id: section.id,
        heading: section.heading,
        body: `Draft content for ${section.heading.replace(/^\s*\d+[.)]?\s*/, '')} based on: ${prompt.trim() || context.title || 'the current document'}.\n\nExpand this section with concrete details, examples, and implementation notes specific to the document context.`,
      }))
    }
    const t = Date.now()
    const topic = prompt.replace(/^create\s+a?\s*/i, '').trim() || 'this project'
    return [
      {
        id: `s-${t}-1`,
        heading: '1. Problem Statement',
        body: `${topic.charAt(0).toUpperCase() + topic.slice(1)}.\n\nCurrent tooling is fragmented, causing friction, context loss, and version drift. Teams spend more time managing handoffs than creating value.`,
      },
      {
        id: `s-${t}-2`,
        heading: '2. Goals & Success Metrics',
        body: '• [Primary goal — define the primary outcome]\n• [Secondary goal — supporting outcomes]\n• Reduce time-to-completion by 30%\n• Increase cross-team visibility\n\nSuccess measured by: [define KPIs and measurement timeline].',
      },
      {
        id: `s-${t}-3`,
        heading: '3. Proposed Solution',
        body: 'Introduce a unified system that [describe core approach]. The key innovation is [what makes this different from existing solutions].\n\nKey components:\n• [Component A] — handles [responsibility]\n• [Component B] — manages [responsibility]\n• [Component C] — provides [capability]',
      },
      {
        id: `s-${t}-4`,
        heading: '4. Architecture',
        body: '[Client] → [API Gateway] → [Core Service] → [Database]\n\nAll communication is [sync/async] via [REST/events]. [Component A] is stateless; [Component B] owns the source of truth.',
      },
      {
        id: `s-${t}-5`,
        heading: '5. Risks & Mitigations',
        body: '• Risk: Adoption resistance. Mitigation: Phased rollout with team champions.\n• Risk: Performance at scale. Mitigation: Load test at 10× expected traffic before launch.\n• Risk: Scope creep. Mitigation: Lock requirements by [date]; defer all additions to v2.',
      },
    ]
  }

  async reviewDocument(doc: Document, agentName: string, _context?: AIRequestContext): Promise<ReviewResult> {
    await sleep(900)

    const sectionsWithContent = doc.sections.filter((s) => s.body.trim().length > 20)
    if (sectionsWithContent.length === 0) {
      return { comments: [], suggestions: [] }
    }

    const toReview = sectionsWithContent.slice(0, 3)
    const t = Date.now()

    const suggestions: Suggestion[] = toReview.map((section, i) => {
      const { reason, addition } = hintForSection(section)
      return {
        id: `sg-${t}-${i}`,
        sectionId: section.id,
        sectionTitle: section.heading,
        originalText: firstLine(section.body),
        suggestedText: section.body.trimEnd() + addition,
        reason,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      }
    })

    const style = AGENT_STYLE[agentName] ?? { color: '#6366f1' }
    const comments: Comment[] = [
      {
        id: `cm-${t}`,
        sectionId: sectionsWithContent[0].id,
        author: 'ai' as const,
        agentName,
        agentColor: style.color,
        agentInitial: (agentName ?? 'A')[0].toUpperCase(),
        text: commentForSection(sectionsWithContent[0]),
        status: 'open' as const,
        createdAt: new Date().toISOString(),
      },
    ]

    return { comments, suggestions }
  }

  async applySuggestion(
    section: Section,
    suggestion: Suggestion,
    onChunk: (chunk: string) => void,
    _context?: AIRequestContext,
  ): Promise<ApplySuggestionResult> {
    const plain = extractPlainText(section.body)
    const result = plain.includes(suggestion.originalText)
      ? plain.replace(suggestion.originalText, suggestion.suggestedText)
      : plain + '\n\n' + suggestion.suggestedText
    const tokens = result.split(/(\s+)/)
    for (const token of tokens) {
      if (token) { onChunk(token); await sleep(18) }
    }
    return { sectionId: section.id, body: result }
  }

  async fixComment(
    section: Section,
    comment: Comment,
    _document: Document,
    _context?: AIRequestContext,
  ): Promise<FixCommentResult> {
    await sleep(600)
    const plain = extractPlainText(section.body)
    const firstSentenceEnd = plain.search(/[.!?]\s/)
    const originalText = firstSentenceEnd > -1
      ? plain.slice(0, firstSentenceEnd + 1)
      : plain.slice(0, Math.min(80, plain.length))
    const note = comment.text.slice(0, 40).trim().replace(/[.!?]*$/, '')
    return { originalText, suggestedText: `${originalText} [Addressed: ${note}.]` }
  }
}
