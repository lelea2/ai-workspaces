import { Router } from 'express'
import { openai } from '../openai.js'
import { getDraftSystemPrompt, getReviewSystemPrompt, getApplySuggestionSystemPrompt, getFixCommentSystemPrompt } from '../prompts.js'
import { mockDraft, mockReview, mockApplySuggestion, mockFixComment } from '../mock.js'
import { extractPlainText } from '../lexical.js'

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

// ── POST /api/ai/apply-suggestion ────────────────────────────────────────────
// Accepts a suggestion by calling AI to rewrite the section body, then returns
// the new body as plain text. The client applies it to its local state; mutation
// sync (PATCH /documents/:id) keeps the server DB up-to-date after dispatch.

type ApplySuggestionPayload = {
  section: { id: string; heading: string; body: string }
  suggestion: { id: string; sectionId: string; originalText: string; suggestedText: string; reason: string }
}

aiRouter.post('/apply-suggestion', async (req, res) => {
  const { section, suggestion } = req.body as Partial<ApplySuggestionPayload>
  if (!section?.id || !suggestion?.originalText) {
    res.status(400).json({ error: 'section and suggestion are required' })
    return
  }

  const plainBody = extractPlainText(section.body ?? '')
  const provider = USE_MOCK ? 'mock' : 'openai'
  console.log(`[ai] provider=${provider}  op=apply-suggestion  section="${section.heading}"`)

  // SSE headers — client reads chunks progressively
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  function sendChunk(text: string) {
    res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`)
  }

  if (USE_MOCK) {
    const fullBody = mockApplySuggestion(plainBody, suggestion.originalText, suggestion.suggestedText)
    const tokens = fullBody.split(/(\s+)/)
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
    ;(async () => {
      for (const token of tokens) {
        if (token) sendChunk(token)
        await delay(18)
      }
      res.write('data: [DONE]\n\n')
      res.end()
      console.log(`[ai] apply-suggestion  section="${section.heading}"  status=200 (mock)`)
    })()
    return
  }

  // Apply the string replacement deterministically on the server.
  // This guarantees the change is actually incorporated — we then ask the AI
  // only to smooth the result, which prevents the model from "playing it safe"
  // and returning the original text unchanged.
  const bodyWithEdit = plainBody.includes(suggestion.originalText)
    ? plainBody.replace(suggestion.originalText, suggestion.suggestedText)
    : (() => {
        // originalText not found verbatim — ask AI to apply contextually instead
        console.warn(`[ai] apply-suggestion  originalText not found verbatim in section "${section.heading}"`)
        return null
      })()

  const userContent = bodyWithEdit !== null
    ? [
        `Section heading (context only — do not include it in your output): "${section.heading}"`,
        '',
        'This draft has already had the following edit applied (replacement is inserted inline).',
        'Smooth any awkward transitions so the text reads naturally. Preserve all added content.',
        '',
        'Body to polish (return only this, edited):',
        '"""',
        bodyWithEdit,
        '"""',
      ].join('\n')
    : [
        `Section heading (context only — do not include it in your output): "${section.heading}"`,
        '',
        'Current body:',
        '"""',
        plainBody,
        '"""',
        '',
        `The following change must be applied — find the closest matching passage and incorporate it:`,
        `- Find: "${suggestion.originalText}"`,
        `- Replace with: "${suggestion.suggestedText}"`,
        `- Reason: ${suggestion.reason}`,
        '',
        'Return only the complete revised body (no heading).',
      ].join('\n')

  try {
    console.log('[ai] apply-suggestion  openai call', {
      section: section.heading,
      originalText: suggestion.originalText,
      suggestedText: suggestion.suggestedText,
      reason: suggestion.reason,
      replacedDirectly: bodyWithEdit !== null,
    })
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      stream: true,
      messages: [
        { role: 'system', content: getApplySuggestionSystemPrompt() },
        { role: 'user', content: userContent },
      ],
    })
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) sendChunk(text)
    }
    res.write('data: [DONE]\n\n')
    res.end()
    console.log(`[ai] apply-suggestion  section="${section.heading}"  status=200`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Apply suggestion failed'
    console.error(`[ai] apply-suggestion  status=500  error=${message}`)
    if (!res.headersSent) res.status(500).json({ error: message })
    else res.end()
  }
})

// ── POST /api/ai/fix-comment ─────────────────────────────────────────────────
// Given a comment and its section, asks AI to identify the relevant text span
// and propose a replacement. Returns { originalText, suggestedText } as JSON.
// The client then feeds this into the apply-suggestion SSE flow for streaming
// preview + user approval before the document actually changes.

type FixCommentPayload = {
  section: { id: string; heading: string; body: string }
  comment: { id: string; text: string; sectionId: string }
}

aiRouter.post('/fix-comment', async (req, res) => {
  const { section, comment } = req.body as Partial<FixCommentPayload>
  if (!section?.id || !comment?.text) {
    res.status(400).json({ error: 'section and comment are required' })
    return
  }

  const plainBody = extractPlainText(section.body ?? '')
  const provider = USE_MOCK ? 'mock' : 'openai'
  console.log(`[ai] provider=${provider}  op=fix-comment  section="${section.heading}"`)

  if (USE_MOCK) {
    const result = mockFixComment(plainBody, comment.text)
    res.json(result)
    return
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: getFixCommentSystemPrompt() },
        {
          role: 'user',
          content: [
            `Section heading (context only — do not include in output): "${section.heading}"`,
            '',
            'Section body:',
            '"""',
            plainBody,
            '"""',
            '',
            `Reviewer comment to address: "${comment.text}"`,
          ].join('\n'),
        },
      ],
    })
    const raw = completion.choices[0].message.content?.trim() ?? '{}'
    const parsed = JSON.parse(stripFences(raw)) as { originalText?: string; suggestedText?: string }

    // Validate that originalText is actually present verbatim in the body
    if (parsed.originalText && parsed.suggestedText && plainBody.includes(parsed.originalText)) {
      console.log(`[ai] fix-comment  section="${section.heading}"  status=200`)
      res.json({ originalText: parsed.originalText, suggestedText: parsed.suggestedText })
      return
    }

    // Fallback: use first sentence if model returned an invalid span
    console.warn(`[ai] fix-comment  originalText not found verbatim — using fallback`)
    const firstSentenceEnd = plainBody.search(/[.!?]\s/)
    const fallbackOriginal = firstSentenceEnd > -1
      ? plainBody.slice(0, firstSentenceEnd + 1)
      : plainBody.slice(0, Math.min(100, plainBody.length))
    res.json({ originalText: fallbackOriginal, suggestedText: parsed.suggestedText ?? fallbackOriginal })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fix comment failed'
    console.error(`[ai] fix-comment  status=500  error=${message}`)
    res.status(500).json({ error: message })
  }
})

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
    .map((s) => `## ${s.heading} [sectionId: ${s.id}]\n\n${extractPlainText(s.body) || '(empty)'}`)
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
        // Validate originalText against plain text (body may be Lexical JSON)
        const section = sectionMap[s.sectionId]
        if (!section) return false
        const plain = extractPlainText(section.body)
        return plain.includes(s.originalText)
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
