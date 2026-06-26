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

### Milestone 1.8 — Human comments & replies (day ~1.5h) ⬅ MISSING

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

---

## Phase 2 — Local DB (In-Memory Store + localStorage)

**Goal**: Remove all hardcoded data from components. Every read comes from the store; every write goes through a reducer action and is persisted to localStorage. The app behaves identically to Phase 1 from the outside, but data is now live and consistent.

### Milestone 2.1 — Types + seed data (~45 min)

Create `src/types/index.ts` with all shared types (Document, Section, Comment, Suggestion, ActivityEvent — matching the Data Model section above).

Create `src/data/seed.ts` — 4 fully-populated documents matching the design:

| Document | Status | Sections | Suggestions | Comments |
|---|---|---|---|---|
| AI Document Collaboration – Technical Design Doc | reviewing | Problem, Proposed Solution, Architecture, Risks & Mitigations | 4 pending | 1 open on Problem |
| Product Requirements – v2 | draft | Overview, Goals, Requirements, Out of Scope | 0 | 0 |
| Security Review – Q2 | approved | Scope, Findings, Recommendations, Sign-off | 0 | 0 |
| Project Plan – Phoenix | draft | Objectives, Timeline, Team, Risks | 2 pending | 0 |

Create `src/data/templates.ts` — 5 templates, each with a name and ordered list of section headings with short placeholder body text (used when creating a new document from template).

Create `src/data/agentPrompts.ts` — default prompt text per agent (already shown in Milestone 1.4 table).

---

### Milestone 2.2 — Reducer + context + localStorage sync (~1.5h)

**`src/store/actions.ts`** — full action type union:

```ts
type Action =
  | { type: 'SET_ACTIVE_DOCUMENT'; id: string }
  | { type: 'CREATE_DOCUMENT'; title: string; sections: Section[] }
  | { type: 'UPDATE_DOCUMENT_TITLE'; id: string; title: string }
  | { type: 'EDIT_SECTION'; docId: string; sectionId: string; body: string }
  | { type: 'GENERATE_DRAFT_START'; docId: string }
  | { type: 'GENERATE_DRAFT_SUCCESS'; docId: string; sections: Section[] }
  | { type: 'RUN_REVIEW_START'; docId: string }
  | { type: 'RUN_REVIEW_SUCCESS'; docId: string; comments: Comment[]; suggestions: Suggestion[] }
  | { type: 'ACCEPT_SUGGESTION'; docId: string; suggestionId: string }
  | { type: 'REJECT_SUGGESTION'; docId: string; suggestionId: string }
  | { type: 'RESOLVE_COMMENT'; docId: string; commentId: string }
  | { type: 'AI_ERROR'; docId: string; error: string }
```

**`src/store/documentReducer.ts`** — pure function, handles each action:

- `EDIT_SECTION`: updates the matching section's `body` and appends an `edited` ActivityEvent
- `ACCEPT_SUGGESTION`: finds section, replaces `originalText` with `suggestedText`, marks suggestion `accepted`, appends `accepted` event, recalculates document `status`
- `REJECT_SUGGESTION`: marks suggestion `rejected`, appends `rejected` event
- `RESOLVE_COMMENT`: marks comment `resolved`, appends `resolved` event
- `GENERATE_DRAFT_SUCCESS`: replaces all sections, sets status to `draft`, appends `drafted` event
- `RUN_REVIEW_SUCCESS`: merges new comments + suggestions, sets status to `reviewing`, appends `reviewed` event
- Document `status` auto-progression: `reviewing` → `approved` when all suggestions are resolved (accepted or rejected)

**`src/store/DocumentContext.tsx`** — the provider:

```ts
// On mount: hydrate from localStorage, fall back to seed
const stored = localStorage.getItem('ai-workspace-docs')
const initial = stored ? JSON.parse(stored) : seedDocuments

// After every dispatch: sync to localStorage
useEffect(() => {
  localStorage.setItem('ai-workspace-docs', JSON.stringify(state.documents))
  localStorage.setItem('ai-workspace-active', state.activeDocumentId)
}, [state])
```

Exposes via context: `{ documents, activeDocumentId, activeDocument, isGenerating, isReviewing, dispatch }`.

**`src/hooks/useDocument.ts`** — convenience hook returning the above + typed dispatch wrappers (e.g. `editSection(sectionId, body)`, `acceptSuggestion(suggestionId)`).

---

### Milestone 2.3 — Wire all components to the store (~2h)

Replace every hardcoded value in components with data from `useDocument()`:

**Sidebar:**
- `documents` list from context — clicking dispatches `SET_ACTIVE_DOCUMENT`
- Active document highlighted by comparing `id` to `activeDocumentId`
- **"+" button** → opens a modal or inline title input → dispatches `CREATE_DOCUMENT` with blank sections
- **Template click** → dispatches `CREATE_DOCUMENT` with sections pre-filled from `templates.ts`
- Search filters the `documents` list client-side (no dispatch needed)

**Header:**
- Title, status badge, "Saved X min ago" from `activeDocument`
- Title is editable (contentEditable or input) → on blur dispatches `UPDATE_DOCUMENT_TITLE`
- **Run AI Review** button → triggers the same flow as Milestone 1.4 (dispatches `RUN_REVIEW_START`, calls mock, dispatches `RUN_REVIEW_SUCCESS`)
- Button disabled while `isReviewing`

**Editor:**
- Sections rendered from `activeDocument.sections`
- Section `textarea` `onBlur` → dispatches `EDIT_SECTION`
- Comment bubbles rendered from `activeDocument.comments` filtered by `sectionId` and `status === "open"`
- Empty state shown when `activeDocument` has no sections yet ("Generate a draft to get started")

**AI Panel:**
- Suggestions from `activeDocument.suggestions`
- Comments from `activeDocument.comments`
- Accept → dispatches `ACCEPT_SUGGESTION`; Reject → dispatches `REJECT_SUGGESTION`
- Resolve comment → dispatches `RESOLVE_COMMENT`
- Submitting the prompt box → dispatches `GENERATE_DRAFT_START` or `RUN_REVIEW_START` depending on active agent, then calls `mockGenerateDraft` / `mockReviewDocument`, then dispatches success/error action

**Timeline:**
- Events from `activeDocument.events`, sorted newest first
- Each event rendered with correct actor avatar, label, and relative timestamp

---

**Phase 2 exit criteria**: All data flows through the store. Hardcoded arrays in components are gone. Creating a new document, editing sections, running mock AI review, accepting/rejecting suggestions, and resolving comments all persist across page refresh via localStorage. Switching between documents in the sidebar loads each document's own state correctly.

---

## Phase 3 — Real OpenAI Integration (via Express proxy)

**Goal**: Replace mock responses with `gpt-4o` calls. Zero UX changes. API key never leaves the server.

### Step 3.1 — Express server

```ts
// server/index.ts
import express from "express";
import { aiRouter } from "./routes/ai";
import path from "path";

const app = express();
app.use(express.json());
app.use("/api/ai", aiRouter);

// Serve built Vite app in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist")));
  app.get("*", (_, res) => res.sendFile(path.join(__dirname, "../dist/index.html")));
}

app.listen(3001);
```

```ts
// server/routes/ai.ts — exposes two endpoints
POST /api/ai/draft    body: { prompt: string, template?: string }   → Section[]
POST /api/ai/review   body: { document: Document, agentName: string } → { comments, suggestions }
```

```ts
// server/openai.ts — reads key from process.env only
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

### Step 3.2 — Environment files

```env
# .env  (git-ignored, never committed)
OPENAI_API_KEY=sk-...       # server only — no VITE_ prefix, Vite never sees it
VITE_AI_PROVIDER=openai     # client toggle — no secret value
```

```env
# .env.example  (committed)
OPENAI_API_KEY=sk-...
VITE_AI_PROVIDER=mock
```

The client proxy service (`src/services/ai/proxy.ts`) calls `fetch("/api/ai/draft")` and `fetch("/api/ai/review")` — no key in the browser at all.

### Step 3.3 — Vite dev proxy config

```ts
// vite.config.ts
server: {
  proxy: {
    "/api": "http://localhost:3001"
  }
}
```

Dev startup (via `concurrently`):
```json
"scripts": {
  "dev": "concurrently \"vite\" \"ts-node server/index.ts\"",
  "build": "vite build",
  "start": "node dist-server/index.js"
}
```

### Step 3.4 — Prompt design

**`generateDraft`:**
```
System: You are a document drafting agent. Return ONLY a JSON array of sections:
        [{id, heading, body}]. Match this template: {templateName}.
        Be specific and realistic. ~100 words per section.
User:   {userPrompt}
```

**`reviewDocument`:**
```
System: You are a {agentName}. Review the document and return ONLY JSON:
        { comments: [{sectionId, text}], suggestions: [{sectionId, originalText, suggestedText, reason}] }
        Be specific, actionable, and concise. originalText must be an exact substring of the section body.
User:   {fullDocumentText serialized as markdown}
```

### Step 3.5 — Error handling
- Server returns `{ error: string }` with appropriate HTTP status on failure
- Client dispatches `AI_ERROR` action; AI panel shows error toast with retry button
- Network errors (server down) show "AI unavailable — check connection"

**Phase 3 exit criteria**: Setting `VITE_AI_PROVIDER=openai` (with `OPENAI_API_KEY` in `.env`) produces real, context-aware drafts and reviews. UX is identical to Phases 1 & 2. Running `npm run build && npm start` serves the full app from Express on port 3001.

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

