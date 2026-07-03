import { Router } from 'express';
import { openai } from '../openai.js';
import { getDraftSystemPrompt, getReviewSystemPrompt, getApplySuggestionSystemPrompt, getFixCommentSystemPrompt } from '../prompts.js';
import { mockDraft, mockDraftFromTemplate, mockReview, mockApplySuggestion, mockFixComment } from '../mock.js';
import { extractPlainText } from '../lexical.js';
const USE_MOCK = process.env.MOCK_AI === 'true';
// Map agent names to the avatar styles used in the frontend
const AGENT_STYLE = {
    'Drafting Agent': { color: '#10b981', initial: 'D' },
    'Reviewer Agent': { color: '#3b82f6', initial: 'R' },
    'Security Agent': { color: '#f43f5e', initial: 'S' },
    'Clarity Agent': { color: '#8b5cf6', initial: 'C' },
    'Technical Risk Agent': { color: '#f59e0b', initial: 'T' },
};
function agentStyle(name) {
    return AGENT_STYLE[name] ?? { color: '#6366f1', initial: name[0]?.toUpperCase() ?? 'A' };
}
function stripFences(raw) {
    return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}
function normalizeHeading(heading) {
    return heading
        .toLowerCase()
        .replace(/^\s*\d+[.)]?\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function coerceDraftToTemplate(templateSections, draftedSections) {
    const byId = new Map(draftedSections.map((s) => [s.id, s]));
    const byHeading = new Map();
    for (const section of draftedSections) {
        const key = normalizeHeading(section.heading);
        const bucket = byHeading.get(key);
        if (bucket)
            bucket.push(section);
        else
            byHeading.set(key, [section]);
    }
    return templateSections.map((template, index) => {
        const byTemplateId = byId.get(template.id);
        const byTemplateHeading = byHeading.get(normalizeHeading(template.heading))?.shift();
        const byOrder = draftedSections[index];
        const match = byTemplateId ?? byTemplateHeading ?? byOrder;
        return {
            id: template.id,
            heading: template.heading,
            body: match?.body?.trim() ? match.body : template.body,
        };
    });
}
export const aiRouter = Router();
aiRouter.post('/apply-suggestion', async (req, res) => {
    const { section, suggestion } = req.body;
    if (!section?.id || !suggestion?.originalText) {
        res.status(400).json({ error: 'section and suggestion are required' });
        return;
    }
    const plainBody = extractPlainText(section.body ?? '');
    const provider = USE_MOCK ? 'mock' : 'openai';
    console.log(`[ai] provider=${provider}  op=apply-suggestion  section="${section.heading}"`);
    // SSE headers — client reads chunks progressively
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    function sendChunk(text) {
        res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
    }
    if (USE_MOCK) {
        const fullBody = mockApplySuggestion(plainBody, suggestion.originalText, suggestion.suggestedText);
        const tokens = fullBody.split(/(\s+)/);
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        (async () => {
            for (const token of tokens) {
                if (token)
                    sendChunk(token);
                await delay(18);
            }
            res.write('data: [DONE]\n\n');
            res.end();
            console.log(`[ai] apply-suggestion  section="${section.heading}"  status=200 (mock)`);
        })();
        return;
    }
    // Apply the string replacement deterministically on the server.
    // This guarantees the change is actually incorporated — we then ask the AI
    // only to smooth the result, which prevents the model from "playing it safe"
    // and returning the original text unchanged.
    const bodyWithEdit = plainBody.includes(suggestion.originalText)
        ? plainBody.replace(suggestion.originalText, suggestion.suggestedText)
        : (() => {
            // originalText not found verbatim — ask AI to apply contextually instead
            console.warn(`[ai] apply-suggestion  originalText not found verbatim in section "${section.heading}"`);
            return null;
        })();
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
        ].join('\n');
    try {
        console.log('[ai] apply-suggestion  openai call', {
            section: section.heading,
            originalText: suggestion.originalText,
            suggestedText: suggestion.suggestedText,
            reason: suggestion.reason,
            replacedDirectly: bodyWithEdit !== null,
        });
        const stream = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.3,
            stream: true,
            messages: [
                { role: 'system', content: getApplySuggestionSystemPrompt() },
                { role: 'user', content: userContent },
            ],
        });
        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text)
                sendChunk(text);
        }
        res.write('data: [DONE]\n\n');
        res.end();
        console.log(`[ai] apply-suggestion  section="${section.heading}"  status=200`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Apply suggestion failed';
        console.error(`[ai] apply-suggestion  status=500  error=${message}`);
        if (!res.headersSent)
            res.status(500).json({ error: message });
        else
            res.end();
    }
});
aiRouter.post('/fix-comment', async (req, res) => {
    const { section, comment, document: doc } = req.body;
    if (!section?.id || !comment?.text) {
        res.status(400).json({ error: 'section and comment are required' });
        return;
    }
    const plainBody = extractPlainText(section.body ?? '');
    const replies = comment.replies ?? [];
    const provider = USE_MOCK ? 'mock' : 'openai';
    console.log(`[ai] provider=${provider}  op=fix-comment  section="${section.heading}"  replies=${replies.length}`);
    if (USE_MOCK) {
        const result = mockFixComment(plainBody, comment.text);
        res.json(result);
        return;
    }
    // Build document context: all sections except the target (provides background for the model)
    const otherSections = (doc?.sections ?? [])
        .filter((s) => s.id !== section.id)
        .map((s) => `## ${s.heading} [${s.id}]\n\n${extractPlainText(s.body)}`)
        .join('\n\n---\n\n');
    // Build the conversation thread from replies
    const replyThread = replies.length > 0
        ? [
            '',
            'Human replies to the comment (in order — use these to understand what specifically should change):',
            ...replies.map((r, i) => `${i + 1}. ${r.agentName}: "${r.text}"`),
        ].join('\n')
        : '';
    const userContent = [
        doc?.title ? `Document title: "${doc.title}"` : '',
        otherSections
            ? `Other sections (for context only — do not modify them):\n---\n${otherSections}\n---`
            : '',
        '',
        `Target section heading (context only — do not include in output): "${section.heading}"`,
        '',
        'Target section body (the only text you may modify):',
        '"""',
        plainBody,
        '"""',
        '',
        `Reviewer comment: "${comment.text}"`,
        replyThread,
    ].filter(Boolean).join('\n');
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.3,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: getFixCommentSystemPrompt() },
                { role: 'user', content: userContent },
            ],
        });
        const raw = completion.choices[0].message.content?.trim() ?? '{}';
        const parsed = JSON.parse(stripFences(raw));
        // Validate that originalText is actually present verbatim in the body
        if (parsed.originalText && parsed.suggestedText && plainBody.includes(parsed.originalText)) {
            console.log(`[ai] fix-comment  section="${section.heading}"  status=200`);
            res.json({ originalText: parsed.originalText, suggestedText: parsed.suggestedText });
            return;
        }
        // Fallback: use first sentence if model returned an invalid span
        console.warn(`[ai] fix-comment  originalText not found verbatim — using fallback`);
        const firstSentenceEnd = plainBody.search(/[.!?]\s/);
        const fallbackOriginal = firstSentenceEnd > -1
            ? plainBody.slice(0, firstSentenceEnd + 1)
            : plainBody.slice(0, Math.min(100, plainBody.length));
        res.json({ originalText: fallbackOriginal, suggestedText: parsed.suggestedText ?? fallbackOriginal });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Fix comment failed';
        console.error(`[ai] fix-comment  status=500  error=${message}`);
        res.status(500).json({ error: message });
    }
});
aiRouter.post('/draft', async (req, res) => {
    const { prompt, context } = req.body;
    if (!prompt?.trim()) {
        res.status(400).json({ error: 'prompt is required' });
        return;
    }
    const templateSections = Array.isArray(context?.sections)
        ? context.sections.filter((s) => s?.id && s?.heading)
        : [];
    const hasTemplateSections = templateSections.length > 0;
    const provider = USE_MOCK ? 'mock' : 'openai';
    console.log(`[ai] provider=${provider}  op=draft  doc=${context?.documentId ?? 'n/a'}  templateSections=${templateSections.length}`);
    if (USE_MOCK) {
        const sections = hasTemplateSections
            ? mockDraftFromTemplate(prompt, templateSections, context?.title)
            : mockDraft(prompt);
        console.log(`[ai] draft  sections=${sections.length}  status=200`);
        res.json(sections);
        return;
    }
    const userContent = hasTemplateSections
        ? [
            `Document id: ${context?.documentId ?? 'unknown'}`,
            `Document title: ${context?.title ?? 'Untitled Document'}`,
            `Draft request: ${prompt}`,
            '',
            'TEMPLATE SECTIONS / SECTION SCHEMA (preserve exactly):',
            ...templateSections.map((s, i) => {
                const plain = extractPlainText(s.body ?? '');
                return [
                    `${i + 1}. id="${s.id}" heading="${s.heading}"`,
                    plain ? `Current section body (context): ${plain}` : 'Current section body (context): (empty)',
                ].join('\n');
            }),
            '',
            'Fill these sections using the draft request and document context.',
            'Return only JSON.',
        ].join('\n\n')
        : prompt;
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
                { role: 'user', content: userContent },
            ],
        });
        const raw = completion.choices[0].message.content?.trim() ?? '{}';
        const parsed = JSON.parse(stripFences(raw));
        const draftedSections = (parsed.sections ?? []).map((s, i) => ({
            id: s.id || `section-${i + 1}`,
            heading: s.heading,
            body: s.body,
        }));
        const sections = hasTemplateSections
            ? coerceDraftToTemplate(templateSections, draftedSections)
            : draftedSections;
        console.log(`[ai] draft  sections=${sections.length}  status=200`);
        res.json(sections);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Draft generation failed';
        console.error(`[ai] draft  status=500  error=${message}`);
        res.status(500).json({ error: message });
    }
});
// ── POST /api/ai/review ───────────────────────────────────────────────────────
aiRouter.post('/review', async (req, res) => {
    const { document: doc, agentName } = req.body;
    if (!doc || !agentName) {
        res.status(400).json({ error: 'document and agentName are required' });
        return;
    }
    const provider = USE_MOCK ? 'mock' : 'openai';
    console.log(`[ai] provider=${provider}  op=review  agent="${agentName}"`);
    if (USE_MOCK) {
        const result = mockReview(doc, agentName);
        console.log(`[ai] review  agent="${agentName}"  comments=${result.comments.length}  suggestions=${result.suggestions.length}  status=200`);
        res.json(result);
        return;
    }
    const docText = doc.sections
        .map((s) => `## ${s.heading} [sectionId: ${s.id}]\n\n${extractPlainText(s.body) || '(empty)'}`)
        .join('\n\n');
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
        });
        const raw = completion.choices[0].message.content?.trim() ?? '{}';
        const parsed = JSON.parse(stripFences(raw));
        const now = new Date().toISOString();
        const t = Date.now();
        const style = agentStyle(agentName);
        const sectionMap = Object.fromEntries(doc.sections.map((s) => [s.id, s]));
        const comments = (parsed.comments ?? [])
            .filter((c) => !!sectionMap[c.sectionId])
            .map((c, i) => ({
            id: `comment-${t}-${i}`,
            sectionId: c.sectionId,
            author: 'ai',
            agentName,
            agentColor: style.color,
            agentInitial: style.initial,
            text: c.text,
            status: 'open',
            createdAt: now,
            replies: [],
        }));
        const suggestions = (parsed.suggestions ?? [])
            .filter((s) => {
            // Validate originalText against plain text (body may be Lexical JSON)
            const section = sectionMap[s.sectionId];
            if (!section)
                return false;
            const plain = extractPlainText(section.body);
            return plain.includes(s.originalText);
        })
            .map((s, i) => ({
            id: `suggestion-${t}-${i}`,
            sectionId: s.sectionId,
            sectionTitle: sectionMap[s.sectionId]?.heading ?? s.sectionId,
            originalText: s.originalText,
            suggestedText: s.suggestedText,
            reason: s.reason,
            status: 'pending',
            createdAt: now,
        }));
        console.log(`[ai] review  agent="${agentName}"  comments=${comments.length}  suggestions=${suggestions.length}  status=200`);
        res.json({ comments, suggestions });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Review failed';
        console.error(`[ai] review  agent="${agentName}"  status=500  error=${message}`);
        res.status(500).json({ error: message });
    }
});
