import { Router } from 'express';
import { openai } from '../openai.js';
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
export const aiRouter = Router();
// ── POST /api/ai/draft ────────────────────────────────────────────────────────
aiRouter.post('/draft', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt?.trim()) {
        res.status(400).json({ error: 'prompt is required' });
        return;
    }
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.7,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a professional document drafting agent.
Return ONLY a JSON object with a "sections" array: { "sections": [{ "id": "<slug>", "heading": "<heading>", "body": "<body>" }] }
- Write 80-120 words per section body. Be specific, realistic, and professional.
- The id should be a short hyphenated slug derived from the heading.
- Include 4-6 sections appropriate for the document type.`,
                },
                { role: 'user', content: prompt },
            ],
        });
        const raw = completion.choices[0].message.content?.trim() ?? '{}';
        const parsed = JSON.parse(stripFences(raw));
        const sections = (parsed.sections ?? []).map((s, i) => ({
            id: s.id || `section-${i + 1}`,
            heading: s.heading,
            body: s.body,
        }));
        res.json(sections);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Draft generation failed';
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
    const docText = doc.sections
        .map((s) => `## ${s.heading} [sectionId: ${s.id}]\n\n${s.body || '(empty)'}`)
        .join('\n\n');
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.4,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are ${agentName}. Review the document and return ONLY a JSON object:
{
  "comments": [{ "sectionId": "<id>", "text": "<observation>" }],
  "suggestions": [{ "sectionId": "<id>", "originalText": "<exact substring>", "suggestedText": "<replacement>", "reason": "<why>" }]
}
Rules:
- sectionId must exactly match one of the section ids in the document.
- originalText MUST be a verbatim, exact substring of that section's body — no paraphrasing or trimming.
- suggestedText is a drop-in replacement for originalText only; do not rewrite the whole section.
- Return 2-4 suggestions and 1-2 comments. Be specific and actionable.
- Skip empty sections entirely.`,
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
        const comments = (parsed.comments ?? []).map((c, i) => ({
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
        const sectionMap = Object.fromEntries(doc.sections.map((s) => [s.id, s]));
        const suggestions = (parsed.suggestions ?? [])
            .filter((s) => {
            // Validate that originalText is actually present in the section body
            const section = sectionMap[s.sectionId];
            return section && section.body.includes(s.originalText);
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
        res.json({ comments, suggestions });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Review failed';
        res.status(500).json({ error: message });
    }
});
