# DECISION.md

Key architectural decisions made during the build, with reasoning and trade-offs.

---

## 1. Mock data lives on the server, not the frontend

**Decision:** All seed documents, templates, and agent configs are defined in `server/db.ts` and served via REST endpoints (`/api/data/*`). When `MOCK_AI=true`, the `/api/ai/draft` and `/api/ai/review` endpoints return deterministic mock responses from `server/mock.ts` instead of calling OpenAI — the client call path is identical either way.

**Why not mock on the frontend?**

If mocks lived in the client, every component that needed seed data would import directly from a local file. Swapping in a real database would require touching every import site in the UI — a ripple that is easy to get wrong and impossible to do incrementally.

With the server as the single data source, the client only knows about `fetch('/api/data/documents')`. Replacing the in-memory store with Postgres, SQLite, or any other database is a change confined to `server/db.ts` and its exported functions. No route changes. No UI changes.

The `MOCK_AI` flag controls only whether the server calls OpenAI or returns a mock response. The client never needs to know which mode is active.

**Trade-off:** Adds a network hop during local development. Acceptable for a POC; the decoupling benefit is worth it.

---

## 2. Data model and how documents are saved and updated

**Document model (`Document` type):**

```
id          — stable UUID-style string, set at creation, never changes
title       — editable string
sections[]  — ordered array of { id, heading, body }
comments[]  — inline observations, keyed to a sectionId
suggestions[] — AI-proposed text changes with originalText / suggestedText pairs
events[]    — append-only activity log (created, edited, reviewed, accepted, …)
status      — draft | reviewing | approved (derived from suggestion lifecycle)
version     — integer, incremented on each AI draft generation
updatedAt   — ISO timestamp updated on every mutation
```

**Why this shape?**

Suggestions carry both `originalText` (exact verbatim substring) and `suggestedText` (the replacement). Keeping both lets the UI show a diff before the user decides, and lets `ACCEPT_SUGGESTION` apply the change precisely inside a Lexical JSON body using `lexicalReplaceText()` without needing a document editor snapshot. `REJECT_SUGGESTION` simply marks the status without touching the body.

The `events` array is append-only, giving a lightweight audit trail (who did what, when) without a separate event store.

---

## 3. Persistence strategy for the POC

**Two-layer persistence:**

| Layer | What it stores | Scope |
|---|---|---|
| `localStorage` | Full document array + active document ID | Client-only, survives page reload |
| Server in-memory DB (`Map<string, Document>`) | Same documents, authoritative during the server session | Lost on server restart |

**How it works:**

1. On app load, `DocumentContext` checks `localStorage` first. If documents exist there, they are used immediately — no server round-trip, no flash of empty content.
2. If `localStorage` is empty (first visit or cleared), the client calls `GET /api/data/documents` and seeds itself from the server's in-memory store.
3. Every state change writes to `localStorage` synchronously, ensuring the next reload picks up exactly where the user left off.
4. Every document mutation (create, update) is forwarded to the server via a fire-and-forget diff in `DocumentContext`: new documents → `POST /api/data/documents`; changed documents → `PATCH /api/data/documents/:id`.

**Why localStorage for the POC?**

A real persistence layer (Postgres, SQLite) would require migration setup, schema management, and Docker volumes — overhead that does not change what the demo proves. `localStorage` gives reload-survival with zero infrastructure. The server-side in-memory DB is already structured behind the same interface (`getDocument`, `updateDocument`, etc.) so swapping it for a real DB only changes the implementation of those functions.

**URL state:** The active document ID is also written to the query string (`?doc=<id>`) so a link to a specific document can be shared or bookmarked.

---

## 4. Storing template bodies in Lexical JSON to preserve rich text formatting

**Decision:** Template section bodies are stored as Lexical editor state JSON (`{"root": {...}}`), not as HTML or plain text.

**Why Lexical JSON?**

The editor is built on [Lexical](https://lexical.dev). Its internal state is a typed node tree: headings, paragraphs, bold/italic runs, lists, links, code blocks. Storing this serialized JSON as `section.body` means:

- **Round-trip fidelity:** Load the JSON back into the editor and the formatting is pixel-perfect. No parsing of HTML or Markdown that could introduce ambiguity.
- **Structured diffing:** `lexicalReplaceText()` walks the node tree to apply an AI suggestion to the specific text node that contains it, leaving surrounding structure intact. A plain-text replace on raw HTML would corrupt tag boundaries.
- **Agent prompts see plain text:** Before sending a document to OpenAI, `extractPlainText(section.body)` recursively walks the node tree and returns clean prose. The model never sees JSON or markup noise.

**Backward compatibility:** Seed documents in `server/db.ts` were created before Lexical was introduced and store plain text. `isLexicalJson(body)` detects the format at runtime. `InitializerPlugin` in the editor handles both: Lexical JSON is parsed directly; plain text is converted to a minimal paragraph tree on first load and saved back as JSON on the first edit.

---

## 5. What information is passed to agent prompts

**Draft agent** (`POST /api/ai/draft`):

The client sends only the user's free-form prompt string (e.g., "Write a technical design doc for an authentication service"). The server prepends a system prompt that:
- Specifies the output contract: a JSON object with a `sections` array, each section having `id`, `heading`, and `body`
- Requires numbered headings (e.g., "1. Problem Statement")
- Requires `id` to be a short hyphenated slug of the heading
- Sets body length guidance (80–120 words, no generic filler)
- Asks for 4–6 sections appropriate to the document type

**Review agents** (`POST /api/ai/review`):

The client sends the full `document` object plus the `agentName`. The server:

1. Extracts plain text from every section body via `extractPlainText()` (so the model receives prose, not Lexical JSON)
2. Formats the document as: `## <heading> [sectionId: <id>]\n\n<plain text body>` for each section — sectionIds are embedded so the model can anchor suggestions to the right section
3. Prepends an agent-specific persona system prompt:
   - **Reviewer Agent** — general clarity, completeness, structure, specificity
   - **Security Agent** — authentication, data exposure, encryption specifics, audit trails
   - **Clarity Agent** — vague language, ownership, passive voice, redundancy, readability
   - **Technical Risk Agent** — single points of failure, rollback plans, underspecified dependencies, performance targets, operational readiness
4. Appends shared output rules requiring a JSON object with `comments[]` and `suggestions[]`, where `originalText` must be a verbatim substring of the section body (validated server-side before the response is returned to the client)

**Why validate `originalText` on the server?**

OpenAI occasionally paraphrases or trims the original text despite explicit instructions. Returning a suggestion whose `originalText` does not exist in the section body would cause a silent no-op when the user accepts it. The server filters these out before they reach the UI.
