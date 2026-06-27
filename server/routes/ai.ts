import { Router } from 'express'
import { openai } from '../openai.js'
import { getDraftSystemPrompt, getReviewSystemPrompt } from '../prompts.js'
import { mockDraft, mockReview } from '../mock.js'

const USE_MOCK = process.env.MOCK_AI === 'true'

// Minimal types mirroring the client — avoids importing across package boundaries
type Section = { id: string; heading: string; body: string }

type RawComment = { sectionId: string; text: string }
type RawSuggestion = {
  sectionId: string
  originalText: string
  suggestedText: string
  reason: string
}

type ReviewedDocument = {
  title: string
  sections: Section[]
}

// Map agent names to the avatar styles used in the frontend
const AGENT_STYLE: Record<string, { color: string; initial: string }> = {
  'Drafting Agent':       { color: '#10b981', initial: 'D' },
  'Reviewer Agent':       { color: '#3b82f6', initial: 'R' },
  'Security Agent':       { color: '#f43f5e', initial: 'S' },
  'Clarity Agent':        { color: '#8b5cf6', initial: 'C' },
  'Technical Risk Agent': { color: '#f59e0b', initial: 'T' },
}

function agentStyle(name: string) {
  return AGENT_STYLE[name] ?? { color: '#6366f1', initial: name[0]?.toUpperCase() ?? 'A' }
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

export const aiRouter = Router()

// ── POST /api/ai/draft ────────────────────────────────────────────────────────
aiRouter.post('/draft', async (req, res) => {
  const { prompt } = req.body as { prompt?: string }
  if (!prompt?.trim()) {
    res.status(400).json({ error: 'prompt is required' })
    return
  }

  const provider = USE_MOCK ? 'mock' : 'openai'
  console.log(`[ai] provider=${provider}  op=draft`)

  if (USE_MOCK) {
    const sections = mockDraft(prompt)
    console.log(`[ai] draft  sections=${sections.length}  status=200`)
    res.json(sections)
    return
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: getDraftSystemPrompt(),
        },
        { role: 'user', content: prompt },
      ],
    })

    const raw = completion.choices[0].message.content?.trim() ?? '{}'
    const parsed = JSON.parse(stripFences(raw)) as { sections?: Section[] }
    const sections: Section[] = (parsed.sections ?? []).map((s, i) => ({
      id: s.id || `section-${i + 1}`,
      heading: s.heading,
      body: s.body,
    }))

    console.log(`[ai] draft  sections=${sections.length}  status=200`)
    res.json(sections)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Draft generation failed'
    console.error(`[ai] draft  status=500  error=${message}`)
    res.status(500).json({ error: message })
  }
})

// ── POST /api/ai/review ───────────────────────────────────────────────────────
aiRouter.post('/review', async (req, res) => {
  const { document: doc, agentName } = req.body as {
    document?: ReviewedDocument
    agentName?: string
  }

  if (!doc || !agentName) {
    res.status(400).json({ error: 'document and agentName are required' })
    return
  }

  const provider = USE_MOCK ? 'mock' : 'openai'
  console.log(`[ai] provider=${provider}  op=review  agent="${agentName}"`)

  if (USE_MOCK) {
    const result = mockReview(doc, agentName)
    console.log(`[ai] review  agent="${agentName}"  comments=${result.comments.length}  suggestions=${result.suggestions.length}  status=200`)
    res.json(result)
    return
  }

  const docText = doc.sections
    .map((s) => `## ${s.heading} [sectionId: ${s.id}]\n\n${s.body || '(empty)'}`)
    .join('\n\n')

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: getReviewSystemPrompt(agentName),
        },
        {
          role: 'user',
          content: `Title: ${doc.title}\n\n${docText}`,
        },
      ],
    })

    const raw = completion.choices[0].message.content?.trim() ?? '{}'
    const parsed = JSON.parse(stripFences(raw)) as {
      comments?: RawComment[]
      suggestions?: RawSuggestion[]
    }

    const now = new Date().toISOString()
    const t = Date.now()
    const style = agentStyle(agentName)

    const comments = (parsed.comments ?? []).map((c, i) => ({
      id: `comment-${t}-${i}`,
      sectionId: c.sectionId,
      author: 'ai' as const,
      agentName,
      agentColor: style.color,
      agentInitial: style.initial,
      text: c.text,
      status: 'open' as const,
      createdAt: now,
      replies: [],
    }))

    const sectionMap = Object.fromEntries(doc.sections.map((s) => [s.id, s]))
    const suggestions = (parsed.suggestions ?? [])
      .filter((s) => {
        // Validate that originalText is actually present in the section body
        const section = sectionMap[s.sectionId]
        return section && section.body.includes(s.originalText)
      })
      .map((s, i) => ({
        id: `suggestion-${t}-${i}`,
        sectionId: s.sectionId,
        sectionTitle: sectionMap[s.sectionId]?.heading ?? s.sectionId,
        originalText: s.originalText,
        suggestedText: s.suggestedText,
        reason: s.reason,
        status: 'pending' as const,
        createdAt: now,
      }))

    console.log(`[ai] review  agent="${agentName}"  comments=${comments.length}  suggestions=${suggestions.length}  status=200`)
    res.json({ comments, suggestions })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Review failed'
    console.error(`[ai] review  agent="${agentName}"  status=500  error=${message}`)
    res.status(500).json({ error: message })
  }
})
