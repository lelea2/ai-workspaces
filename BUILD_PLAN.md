# Build Plan — AI Collaborative Document Workspace

## Stack

- **Vite + React + TypeScript** — fast dev loop, familiar ecosystem
- **Tailwind CSS v4** — utility-first, no stylesheet overhead, fast to iterate on the design's clean aesthetic
- **useReducer + Context** — centralized document state; the reducer is the in-memory DB, every mutation is explicit and auditable
- **localStorage** — persistence layer synced on every dispatch; documents, suggestions, and timeline survive page refresh
- **Express proxy** (Phase 3) — thin server keeps `OPENAI_API_KEY` out of the client bundle entirely
- **OpenAI SDK** (Phase 3) — `openai` npm package on the server, `gpt-4o` for draft generation and review

---

## Architecture Overview

```
project root
├── server/                      # Added in Phase 3
│   ├── index.ts                 # Express app — mounts /api routes, serves built Vite app in prod
│   ├── routes/ai.ts             # POST /api/ai/draft, POST /api/ai/review
│   └── openai.ts                # OpenAI SDK calls — reads process.env.OPENAI_API_KEY (never sent to client)
├── .env                         # Server-side secrets: OPENAI_API_KEY, AI_PROVIDER
├── .env.example                 # Committed template (no real values)
└── src/
    ├── types/
    │   └── index.ts             # All shared types: Document, Section, Suggestion, Comment, ActivityEvent
    ├── store/                   # In-memory DB + state management
    │   ├── actions.ts           # Action type union (CREATE_DOCUMENT, EDIT_SECTION, ACCEPT_SUGGESTION, ...)
    │   ├── documentReducer.ts   # Pure reducer — each action is one DB mutation
    │   └── DocumentContext.tsx  # Provider: initializes from localStorage (falls back to seed), syncs on dispatch
    ├── hooks/
    │   ├── useDocument.ts       # Reads active document + all documents from context; exposes dispatch helpers
    │   └── useAI.ts             # Wraps getAIService(), manages loading/error/idle state
    ├── services/
    │   └── ai/
    │       ├── types.ts         # AIService interface (generateDraft, reviewDocument)
    │       ├── mock.ts          # Deterministic mock responses with simulated delay
    │       ├── proxy.ts         # Calls /api/ai/* on the Express server (Phase 3)
    │       └── index.ts         # getAIService() — picks mock or proxy from VITE_AI_PROVIDER
    ├── components/
    │   ├── Sidebar/             # DocumentList, TemplateList, SearchBar — all data from context
    │   ├── Header/              # Title, status badge, save indicator, Share, Run AI Review — from active doc
    │   ├── Editor/              # Toolbar, SectionRow (textarea + CommentBubble column) — from active doc
    │   ├── AIPanel/             # AgentSelector, PromptBox, SuggestionList, CommentList — from active doc
    │   └── Timeline/            # Activity feed — events[] from active doc, newest first
    ├── data/
    │   ├── seed.ts              # 4 fully-populated seed documents (used only on first load)
    │   ├── templates.ts         # 5 template definitions: name + section headings + placeholder bodies
    │   └── agentPrompts.ts      # Default prompt text per agent
    └── App.tsx                  # Layout shell + DocumentContext.Provider
```

### Key architectural invariants

**1. The reducer is the in-memory DB.** All state lives in the `useReducer` store inside `DocumentContext`. No component owns document data — they all read from context and dispatch actions to mutate it.

**2. localStorage is a sync layer, not the source of truth.** On every dispatch, the provider serializes the full `documents[]` array to `localStorage["ai-workspace-docs"]`. On mount, it hydrates from localStorage (or falls back to `seed.ts` on first load). The in-memory state is always authoritative during a session.

**3. The UI never imports `mock.ts` or `proxy.ts` directly.** Everything goes through `getAIService()` which reads `VITE_AI_PROVIDER`. Swapping providers is a one-line env change — no component changes.

**4. The key never touches the client.** (Phase 3) `OPENAI_API_KEY` lives only in server `process.env`. Vite proxies `/api` to Express in dev; Express serves `dist/` in production.

---

## Data Model

Exactly as specified in the product plan:

```ts
// types/index.ts
type Document = {
  id: string;
  title: string;
  sections: Section[];
  comments: Comment[];
  suggestions: Suggestion[];
  events: ActivityEvent[];
  version: number;
  status: "draft" | "reviewing" | "approved";
};

type Section    = { id: string; heading: string; body: string };
type Comment    = { id: string; sectionId: string; author: "human" | "ai"; text: string; status: "open" | "resolved" | "dismissed"; createdAt: string };
type Suggestion = { id: string; sectionId: string; originalText: string; suggestedText: string; reason: string; status: "pending" | "accepted" | "rejected"; createdAt: string };
type ActivityEvent = { id: string; actor: "human" | "ai"; agentName?: string; type: "created" | "drafted" | "reviewed" | "edited" | "accepted" | "rejected" | "resolved"; message: string; createdAt: string };
```

**Persistence** (wired in Phase 2): On every reducer dispatch, the `DocumentContext` provider serializes `documents[]` to `localStorage["ai-workspace-docs"]`. On app mount it hydrates from storage, falling back to `seed.ts` on first load. The `activeDocumentId: string` is stored separately in `localStorage["ai-workspace-active"]`.

---

## AI Service Interface

```ts
// services/ai/types.ts
interface AIService {
  generateDraft(prompt: string, template?: string): Promise<Section[]>;
  reviewDocument(doc: Document, agentName: string): Promise<{ comments: Comment[]; suggestions: Suggestion[] }>;
}
```

Both `mock.ts` and `openai.ts` implement this interface. The mock returns hardcoded but realistic content with a simulated 800ms delay. The OpenAI implementation calls `chat.completions.create` with a structured JSON output prompt.

---

## Phase 1 — Mock API + Full UX

**Goal**: Every UI interaction works end-to-end. No real AI needed. Reviewers can use the product fully.

### Milestone 1.1 — Static shell ✅ DONE
- Three-column CSS grid: `260px | 1fr | 360px`
- Left sidebar with hardcoded document list and template list
- Empty editor area and AI panel
- Bottom activity timeline bar
- Header with title, status badge, buttons

### Milestone 1.2 — State + persistence ✅ DONE
- `documentReducer.ts` with all action types
- `DocumentContext.tsx` wrapping the app
- localStorage middleware in the context provider
- Seed data: 6 pre-populated documents (AI Doc Collaboration, Product Requirements, Security Review – Q2, Project Plan – Phoenix, Launch Plan, Incident Review)

### Milestone 1.3 — Editor with comment bubbles ✅ DONE

Each section renders as a two-column row inside the editor:

```
┌─────────────────────────────────────┬──────────────────┐
│  h2 heading                         │                  │
│  <textarea> body text               │  ● AI Reviewer   │
│                                     │  "Add measurable │
│                                     │   success..."    │
└─────────────────────────────────────┴──────────────────┘
```

- The right column (`w-48 flex-shrink-0`) holds `CommentBubble` components, one per open comment on that section
- Each bubble shows: agent avatar circle, agent name, comment preview (truncated), timestamp
- Clicking the bubble expands it into a popover showing the full comment text + Resolve button
- If a section has no comments, the right column is empty (no layout shift)
- `onBlur` dispatches `EDIT_SECTION` and logs an activity event
- Toolbar renders (bold, italic, headings, lists) — visual only in Phase 1

### Milestone 1.4 — AI Panel with auto-fill ✅ DONE

**Agent selector behavior:**
When an agent button is clicked, the `PromptBox` textarea is immediately populated with that agent's default prompt text. The user can freely edit the pre-filled text before submitting. Active agent is highlighted.

Default prompts per agent (stored in `data/agentPrompts.ts`):

| Agent | Auto-filled prompt |
|---|---|
| Drafting Agent | `Create a [document type] for [describe your project or feature]` |
| Reviewer Agent | `Review this document for clarity, completeness, and any missing sections.` |
| Security Agent | `Review this document for security risks, access control gaps, and audit requirements.` |
| Clarity Agent | `Improve the clarity and readability of this document. Flag any vague or ambiguous sections.` |
| Technical Risk Agent | `Identify technical risks, dependencies, and potential failure modes in this design.` |

The prompt box cursor is placed at the start of `[...]` placeholders so the user's first keypress replaces them naturally.

**Submission flow:**
- On submit → calls `mockGenerateDraft()` or `mockReviewDocument()` based on active agent type
- Drafting Agent → `GENERATE_DRAFT_SUCCESS` → sections appear in editor
- All other agents → `RUN_REVIEW_SUCCESS` → comments + suggestions populated
- **Run AI Review** button in header is a shortcut that activates Reviewer Agent + submits immediately

Suggestions tab: cards with `Accept` / `Dismiss` per suggestion, showing `reason` and which section. Comments tab: list of open AI comments, each linking back to its section.

### Milestone 1.5 — Accept / Reject flow ✅ DONE
- `ACCEPT_SUGGESTION`: finds section, replaces `originalText` with `suggestedText`, marks suggestion accepted, logs event
- `REJECT_SUGGESTION`: marks suggestion rejected, logs event
- Accepted/rejected suggestions are visually distinguished (green check / grey dismissed badge)
- Section body in editor updates live when a suggestion is accepted
- Auto-promotion: document transitions `reviewing → approved` when all suggestions are non-pending

### Milestone 1.6 — Activity Timeline ✅ DONE
- Bottom panel renders all `events[]` for the active document, newest first
- Each event shows: avatar, actor name, action description, type icon, relative timestamp
- "View all N" toggle expands full event list

### Milestone 1.7 — Polish ✅ DONE
- Loading skeleton while mock delay runs (editor skeleton when generating, suggestion skeleton cards when reviewing)
- Empty states: no documents, no suggestions, no comments
- Disabled states: Run AI Review and submit disabled while AI is running
- Document status badge: Draft → Reviewing (animate-pulse) → Approved (green, auto-triggered)
- "Document approved / All suggestions resolved" celebration card in AI panel
- Word count in editor footer
- Sidebar and AI panel toggle buttons (collapse/expand independently)
- Inline title editing: click header title → editable input → Enter commits, Escape cancels
- Templates create documents with real pre-filled section content (not empty sections)
- Error toast: 5s auto-dismiss, fixed-position, dismissible

### Milestone 1.8 — Human comments & replies ✅ DONE

Two human authoring flows are currently absent from Phase 1:

**Gap 1 — Human cannot add their own comments to a section**

Today only AI agents produce comment bubbles. A human reviewer has no way to annotate a section inline. This breaks the core "humans and agents write together" value proposition.

Required UX:
- Each section row shows a `+` comment button on hover (right of the heading or top of the bubble column)
- Clicking it opens a small inline compose box (textarea + Post / Cancel) anchored in the section's bubble column
- On Post: dispatches `ADD_COMMENT` → creates a `Comment` with `author: 'human'`, `agentName: 'Khanh'`, `agentColor: '#6366f1'`, `agentInitial: 'K'`, `status: 'open'`
- The new bubble appears immediately in the right column, indistinguishable in style from AI bubbles except for the human avatar
- Logs an `ActivityEvent` of type `'commented'`

New action required:
```ts
{ type: 'ADD_COMMENT'; docId: string; sectionId: string; text: string }
```

New `ActivityEvent` type value: `'commented'` (add to the union in `types/index.ts`)

**Gap 2 — User cannot reply to AI (or human) comments**

The "Reply" button in expanded `CommentBubble` is a dead no-op. There is no way to push back on or acknowledge an AI comment inline.

Required UX:
- Clicking **Reply** in an expanded bubble opens a small reply compose box below the comment text (same bubble, inline)
- Typing + pressing Post dispatches `REPLY_TO_COMMENT` → appends a reply to that comment
- The reply appears indented inside the bubble with: human avatar, reply text, relative timestamp
- Replying does not change the comment's `status` (it stays `open` until Resolved)
- Logs an `ActivityEvent` of type `'replied'`

Data model change — add `replies` array to `Comment`:
```ts
type Reply = {
  id: string
  author: 'human' | 'ai'
  agentName: string
  agentColor: string
  agentInitial: string
  text: string
  createdAt: string
}

// Comment gains:
replies: Reply[]   // default []
```

New action required:
```ts
{ type: 'REPLY_TO_COMMENT'; docId: string; commentId: string; text: string }
```

New `ActivityEvent` type value: `'replied'`

**Implementation notes:**
- Compose box state (`composingCommentId`, `replyingToId`) lives in component-local state — no store entry needed
- `ADD_COMMENT` reducer appends to `doc.comments` and prepends an ActivityEvent
- `REPLY_TO_COMMENT` reducer finds the comment by `commentId`, appends to `comment.replies`, prepends an ActivityEvent
- Replies are displayed in the expanded bubble, newest last, with a left border accent
- The AI Panel Comments tab should also show replies when a comment is expanded

**Phase 1 exit criteria (updated)**: A reviewer can open the app, create a new document from a template, generate a draft, edit sections, run AI review, accept/reject suggestions, add their own inline comments on any section, reply to any comment (AI or human), and see the full activity history — all with mock data that persists on refresh.

### Milestone 1.9 — URL-based document routing + Share ✅ DONE

**Gap identified**: There was no way to link someone directly to a specific document, and the "Share" button was a visual placeholder with no behavior.

**URL routing** (`DocumentContext.tsx`):
- On mount, `loadState()` reads `?doc=<id>` from the URL and uses it as `activeDocumentId` if the ID matches a loaded document (URL param takes priority over localStorage)
- A `useEffect` watching `activeDocumentId` calls `window.history.replaceState` to keep the URL in sync whenever the user switches documents — no full navigation, no history stack pollution
- Navigating directly to `http://app/?doc=doc-123` in a fresh tab loads that exact document immediately

**Share popup** (`Header.tsx`):
- Clicking the Share button opens a floating card below it (click-outside + Escape to close)
- Card shows: a read-only monospace input with the full URL (`origin + pathname + ?doc=<id>`), a Copy button that writes to clipboard and shows a "Copied ✓" confirmation for 2 s
- No authentication or permission model in scope — the URL itself is the access mechanism

**Phase 1 exit criteria (final)**: A reviewer can open the app, navigate to a document by URL, create a new document from a template, generate a draft, edit sections, run AI review, accept/reject suggestions, add their own inline comments on any section, reply to any comment (AI or human), see the full activity history, and share a direct link to any document — all with mock data that persists on refresh.

---

## Phase 2 — Local DB (In-Memory Store + localStorage) ✅ DONE

**Note**: Phase 2 was implemented concurrently with Phase 1. All components were wired to the live store from the start — no hardcoded data was ever shipped in components. All milestones below are complete.

### Milestone 2.1 — Types + seed data ✅ DONE

**`src/types/index.ts`** — complete type definitions:
- `Document`, `Section`, `Comment`, `Reply`, `Suggestion`, `ActivityEvent`, `AppState`
- `Reply` (added in M1.8) extends `Comment` with threaded replies
- `ActivityEvent.type` union: `created | drafted | reviewed | edited | accepted | rejected | resolved | commented | replied`

**`src/data/seed.ts`** — 6 fully-populated seed documents (exceeds original 4-doc spec):

| Document | Status | Sections | Suggestions | Comments |
|---|---|---|---|---|
| AI Document Collaboration – Technical Design Doc | reviewing | 5 sections | 4 pending | 1 open (Goals) |
| Product Requirements – v2 | draft | 4 sections | 0 | 0 |
| Security Review – Q2 | approved | 4 sections | 0 | 0 |
| Project Plan – Phoenix | reviewing | 4 sections | 2 pending | 0 |
| Launch Plan – v1.0 | draft | 3 sections | 0 | 0 |
| Incident Review 2024-05 | approved | 4 sections | 0 | 0 |

Each document has a properly-ordered `events[]` with realistic relative timestamps via the `now(offset)` utility.

**`src/data/templates.ts`** — 5 templates (Product Spec, Technical Design Doc, Security Review, Project Plan, Incident Review). Each template section has a real placeholder body with `[bracket]` prompts so users know what to fill in. `buildTemplateSections()` generates stable IDs using `Date.now()`.

**`src/data/agentPrompts.ts`** — `AgentConfig[]` with 5 agents, each with id, name, color classes, initial letter, default prompt, and `type: 'draft' | 'review'` to drive the submit path.

---

### Milestone 2.2 — Reducer + context + localStorage sync ✅ DONE

**`src/store/actions.ts`** — full action union (14 actions including M1.8 additions):

```ts
type Action =
  | { type: 'SET_ACTIVE_DOCUMENT'; id: string }
  | { type: 'CREATE_DOCUMENT'; title: string; sections: Section[] }
  | { type: 'UPDATE_DOCUMENT_TITLE'; docId: string; title: string }
  | { type: 'EDIT_SECTION'; docId: string; sectionId: string; body: string }
  | { type: 'GENERATE_DRAFT_START'; docId: string }
  | { type: 'GENERATE_DRAFT_SUCCESS'; docId: string; sections: Section[] }
  | { type: 'RUN_REVIEW_START'; docId: string }
  | { type: 'RUN_REVIEW_SUCCESS'; docId: string; comments: Comment[]; suggestions: Suggestion[] }
  | { type: 'ACCEPT_SUGGESTION'; docId: string; suggestionId: string }
  | { type: 'REJECT_SUGGESTION'; docId: string; suggestionId: string }
  | { type: 'RESOLVE_COMMENT'; docId: string; commentId: string }
  | { type: 'ADD_COMMENT'; docId: string; sectionId: string; text: string }
  | { type: 'REPLY_TO_COMMENT'; docId: string; commentId: string; text: string }
  | { type: 'AI_ERROR'; docId: string; error: string }
```

**`src/store/documentReducer.ts`** — pure reducer; `updateDoc()` helper keeps doc mutations concise. `recalcStatus()` auto-promotes `reviewing → approved` when all suggestions are non-pending. Every mutation prepends an `ActivityEvent`.

**`src/store/DocumentContext.tsx`** — two `useEffect` hooks:
1. Sync `documents[]` + `activeDocumentId` to localStorage on every state change
2. Sync `?doc=<id>` URL param via `history.replaceState` on active doc change (M1.9)

`loadState()` priority: URL param → localStorage → seed data.

**`src/hooks/useDocument.ts`** — one-line context reader; components call `dispatch` directly with typed actions (raw dispatch is more readable than wrappers for this action volume).

---

### Milestone 2.3 — Wire all components to the store ✅ DONE

All components read exclusively from `useDocument()`:

- **Sidebar**: `documents[]` from context, `SET_ACTIVE_DOCUMENT` on click, `CREATE_DOCUMENT` for new docs and template clicks, client-side search filter
- **Header**: title/status/saved-time from `activeDocument`, `UPDATE_DOCUMENT_TITLE` on blur, `Run AI Review` → `useAI().runReview()`, disabled during AI operations, Share popup with URL copy (M1.9)
- **Editor**: sections from `activeDocument.sections`, `EDIT_SECTION` on textarea blur, comment bubbles filtered by `sectionId + status === 'open'`, `+` hover button → `ADD_COMMENT`, reply compose → `REPLY_TO_COMMENT` (M1.8)
- **AI Panel**: suggestions + comments from `activeDocument`, accept/dismiss/resolve dispatch to reducer, agent selector pre-fills prompt textarea, submit calls `useAI()` which routes to draft or review flow
- **Timeline**: `activeDocument.events` newest first, type icon per event (14 event types including `commented` and `replied`)

**Phase 2 exit criteria** ✅: All data flows through the store. No hardcoded data in components. Creating documents, editing sections, AI review, accept/reject, human comments, replies, and resolves all persist across page refresh. Switching documents loads isolated state. URL param deep-links to any document.

---

## Phase 3 — Real OpenAI Integration (via Express proxy)

**Goal**: Replace mock responses with `gpt-4o` calls. Zero UX changes. API key never leaves the server.

### Step 3.0 — Environment files ✅ DONE

Two env files control the split between server secrets and client config:

**`/.env`** (git-ignored, fill in before running server):
```env
OPENAI_API_KEY=sk-xxxxx    # server only — no VITE_ prefix, Vite never sees it
PORT=3001
```

**`/workspace/.env`** (committed, no secrets):
```env
# 'mock' — deterministic responses, no server needed (default)
# 'proxy' — calls Express /api/ai/*, requires OPENAI_API_KEY in root .env
VITE_AI_PROVIDER=mock
```

To switch to real AI: set `OPENAI_API_KEY=sk-...` in root `.env`, start the server, then change `workspace/.env` to `VITE_AI_PROVIDER=proxy`.

The Vite proxy (`workspace/vite.config.ts`) already forwards `/api → http://localhost:3001` — no further config needed.

### Step 3.1 — Express server + routes ✅ DONE

**`server/index.ts`** — Express app with dotenv, JSON middleware, `/api/ai` router:
```ts
import 'dotenv/config'
import express from 'express'
import { aiRouter } from './routes/ai'
import path from 'path'

const app = express()
app.use(express.json())
app.use('/api/ai', aiRouter)

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../workspace/dist')))
  app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../workspace/dist/index.html')))
}

app.listen(Number(process.env.PORT ?? 3001))
```

**`server/routes/ai.ts`** — two endpoints:
```
POST /api/ai/draft    body: { prompt: string }                        → Section[]
POST /api/ai/review   body: { document: Document, agentName: string } → { comments, suggestions }
```

**`server/openai.ts`** — singleton client, reads key from `process.env` only:
```ts
import OpenAI from 'openai'
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
```

Dev startup (`package.json` at root, using `concurrently`):
```json
"scripts": {
  "dev": "concurrently \"npm run dev --prefix workspace\" \"tsx watch server/index.ts\"",
  "start": "node dist-server/index.js"
}
```

### Step 3.2 — Client proxy service + provider toggle ✅ DONE

**`workspace/src/services/ai/proxy.ts`** — calls Express, no key in browser:
```ts
export class ProxyAIService implements AIService {
  async generateDraft(prompt) {
    const res = await fetch('/api/ai/draft', { method: 'POST', body: JSON.stringify({ prompt }) })
    if (!res.ok) throw new Error(await res.text())
    return res.json()  // Section[]
  }
  async reviewDocument(doc, agentName) {
    const res = await fetch('/api/ai/review', { method: 'POST', body: JSON.stringify({ document: doc, agentName }) })
    if (!res.ok) throw new Error(await res.text())
    return res.json()  // { comments, suggestions }
  }
}
```

**`workspace/src/services/ai/index.ts`** — switch on `VITE_AI_PROVIDER`:
```ts
export function getAIService(): AIService {
  return import.meta.env.VITE_AI_PROVIDER === 'proxy'
    ? new ProxyAIService()
    : new MockAIService()
}
```

### Step 3.3 — Prompt design ✅ DONE

**`generateDraft`** system prompt:
```
You are a document drafting agent. Return ONLY a valid JSON array of section objects:
[{ "id": "<slug>", "heading": "<heading>", "body": "<body text>" }]
Write ~100 words per section. Be specific and realistic. No markdown fences.
```

**`reviewDocument`** system prompt:
```
You are {agentName}. Review the document below and return ONLY valid JSON:
{ "comments": [{ "sectionId": "...", "text": "..." }],
  "suggestions": [{ "sectionId": "...", "originalText": "...", "suggestedText": "...", "reason": "..." }] }
originalText MUST be an exact verbatim substring of the section body. Be specific and actionable.
```

### Step 3.4 — Error handling ✅ DONE
- Server returns `{ error: string }` with HTTP 4xx/5xx on failure
- Client dispatches `AI_ERROR`; existing error toast displays the message with 5s auto-dismiss
- Network errors (server unreachable) caught in `useAI` and dispatched as `AI_ERROR`
- `useAI.ts` updated: catch blocks now forward `err.message` instead of hardcoded strings — real OpenAI errors, quota messages, and "Failed to fetch" network errors all surface in the toast

**Phase 3 exit criteria**: Setting `VITE_AI_PROVIDER=proxy` (with real `OPENAI_API_KEY`) produces context-aware drafts and reviews. Mock path still works without the server. Running `npm start` from root serves the full app from Express on port 3001.

---

## Seed Data Plan

Pre-populate 4 documents so the app looks like a real workspace on first load:

| Document | Status | Has suggestions |
|---|---|---|
| AI Document Collaboration – Technical Design Doc | reviewing | 4 pending suggestions (matches the design exactly) |
| Product Requirements – v2 | draft | 0 |
| Security Review – Q2 | approved | 0 |
| Project Plan – Phoenix | draft | 2 pending |

Templates (left sidebar):
- Product Spec, Technical Design Doc, Security Review, Project Plan, Incident Review

---

## Bootstrap Commands

```bash
npm create vite@latest workspace -- --template react-ts
cd workspace

# Client dependencies
npm install

# Tailwind CSS v4
npm install tailwindcss @tailwindcss/vite

# Server dependencies
npm install express dotenv
npm install -D @types/express ts-node concurrently
```

Add to `vite.config.ts`:
```ts
import tailwindcss from "@tailwindcss/vite";
plugins: [react(), tailwindcss()]
```

Add to `src/index.css`:
```css
@import "tailwindcss";
```

Folder structure:
```bash
mkdir -p server/routes
mkdir -p src/{types,store,services/ai,hooks,data}
mkdir -p src/components/{Sidebar,Header,Editor,AIPanel,Timeline}
```

---

## What's Out of Scope (intentionally)

- Real-time multiplayer (WebSocket / CRDT)
- Rich text (ProseMirror / Slate) — textareas are sufficient for demonstrating the human+AI loop
- Auth / user accounts
- Backend / database
- Export (Google Docs, PDF)
- Version diffing UI

