# AI Collaborative Document Workspace

## 1. Product Goal

Build a document workspace where humans and AI agents can author, review, and revise documents in one shared loop.

Today, AI-generated writing and human review often happen in disconnected tools. A user asks an AI agent to draft a product spec, technical design doc, security review, or project plan, then copies the result into Google Docs for collaboration. This creates context loss, version drift, and a messy review process.

This product closes that gap by making the document itself the shared workspace.

The core principle:

> AI proposes, AI critiques, humans steer and decide.

---

## 2. Target Users

Primary users include:

- Product managers
- Engineers
- Designers
- Security reviewers
- Team leads
- Cross-functional project owners

They commonly write and review:

- Product specs
- Technical design docs
- Security reviews
- Launch plans
- Project plans
- Incident reviews

---

## 3. Core Problem

Teams increasingly use AI to generate and improve documents, but the workflow is fragmented:

1. A user asks AI to draft a document.
2. AI generates the draft in a chat interface.
3. The user copies the draft into a document editor.
4. Humans review and edit in a separate tool.
5. AI loses awareness of the latest document state, comments, and decisions.

This creates several problems:

- Copy/paste friction
- Lost context
- Version drift
- Unclear authorship
- AI suggestions that are not reviewable
- Human decisions that are not captured clearly

---

## 4. Product Concept

Create a collaborative document editor where people and AI agents work together inside the same document.

The product supports three core actions:

1. **AI drafts**
   - Generate an initial document from a prompt or template.

2. **AI reviews**
   - Add inline comments, critique sections, identify risks, and suggest improvements.

3. **Humans decide**
   - Accept, reject, revise, or respond to AI suggestions.

The document remains the source of truth.

---

## 5. UX Layout

The app has three main areas:

```txt
+--------------------------------------------------------------------------------+
| Header: Document Title                                      Share | Run Review |
+----------------------+-----------------------------------------+---------------+
| Document List         | Editor                                  | AI Panel      |
|                      |                                         |               |
| - Product Spec        | # Technical Design Doc                  | Draft Agent   |
| - Security Review     |                                         | Review Agent  |
| - Launch Plan         | Problem                                 | Security Agent|
|                      | Proposed Solution                       | Prompt input  |
|                      | Architecture                            | Suggestions   |
|                      | Risks                                   | Comments      |
+----------------------+-----------------------------------------+---------------+
| Activity Timeline: AI drafted -> Human edited -> AI reviewed -> Suggestion accepted |
+--------------------------------------------------------------------------------+
```

---

## 6. Main UI Sections

### 6.1 Left Sidebar: Documents and Templates

The left sidebar helps users navigate documents and start from templates.

It includes:

- Search docs
- Recent documents
- Document templates
- Current selected document

Example templates:

- Product Spec
- Technical Design Doc
- Security Review
- Project Plan
- Incident Review

---

### 6.2 Center Panel: Document Editor

The editor is the main workspace.

Users can:

- Write manually
- Edit AI-generated content
- View structured sections
- See inline AI comments
- Review highlighted suggestions
- Accept or reject proposed changes

The editor should feel like a simplified Google Docs-style experience, but scoped for the take-home.

---

### 6.3 Right Panel: AI Assistant

The AI panel shows available agents and actions.

Example agents:

- Drafting Agent
- Reviewer Agent
- Security Agent
- Clarity Agent
- Technical Risk Agent

Users can ask AI to:

- Generate a first draft
- Rewrite a section
- Review the document
- Add missing risks
- Improve clarity
- Suggest success metrics
- Summarize open decisions

---

### 6.4 Bottom Panel: Activity Timeline

The activity timeline shows a transparent history of collaboration.

Example events:

- Khanh created document
- Drafting Agent generated initial draft
- Khanh edited Goals section
- AI Reviewer added 4 suggestions
- Khanh accepted a security recommendation
- Khanh rejected a rewrite suggestion

This makes authorship and decision-making visible.

---

## 7. Core User Flows

## Flow 1: Create a Document

1. User opens the workspace.
2. User selects a template or starts from blank.
3. User enters a prompt, such as:

```txt
Create a technical design doc for an AI-powered document collaboration system.
```

4. AI generates a structured draft.
5. Draft appears directly in the editor.

---

## Flow 2: Run AI Review

1. User clicks **Run AI Review**.
2. AI reads the current document.
3. AI returns comments and suggestions.
4. Comments are shown inline and in the right panel.

Example AI feedback:

- “Consider adding measurable success criteria.”
- “The security section is too vague.”
- “Explain how document persistence is handled.”
- “Add rollout and failure handling details.”

---

## Flow 3: Human Reviews Suggestions

For each AI suggestion, the user can:

- Accept
- Reject
- Ask AI to revise
- Dismiss
- Reply with more context

When a suggestion is accepted:

- The document content updates.
- The suggestion status changes to accepted.
- A timeline event is added.

When rejected:

- The document content stays unchanged.
- The suggestion status changes to rejected.
- A timeline event is added.

---

## Flow 4: Track History

Every meaningful action creates an activity event.

Examples:

- Document created
- Draft generated
- Section edited
- Review completed
- Suggestion accepted
- Suggestion rejected

This creates a lightweight audit trail.

---

## 8. MVP Scope

For a take-home interview, the MVP should be small but complete.

### Must Have

- Static responsive layout
- Document editor
- Mock AI draft generation
- Mock AI review
- Inline comments
- Suggestions list
- Accept and reject actions
- Activity timeline
- Loading states
- Empty states

### Nice to Have

- LocalStorage persistence
- Multiple document templates
- Version history
- Comment resolution
- Section-level rewrite
- Mobile responsive drawer for AI panel

### Out of Scope

- Real-time multiplayer editing
- Google Docs-level rich text editing
- Authentication
- Real backend
- Real LLM integration
- Complex permissions
- Full version diff system

---

## 9. Component Architecture

```txt
App
├── Header
├── Sidebar
│   ├── DocumentSearch
│   ├── DocumentList
│   └── TemplateList
├── EditorShell
│   ├── Toolbar
│   ├── DocumentEditor
│   ├── DocumentSection
│   ├── InlineComment
│   └── SuggestionHighlight
├── AIPanel
│   ├── AgentSelector
│   ├── PromptBox
│   ├── SuggestionList
│   ├── SuggestionCard
│   └── CommentList
└── ActivityTimeline
    └── ActivityEvent
```

---

## 10. Data Model

```ts
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

type Section = {
  id: string;
  heading: string;
  body: string;
};

type Comment = {
  id: string;
  sectionId: string;
  author: "human" | "ai";
  text: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
};

type Suggestion = {
  id: string;
  sectionId: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};

type ActivityEvent = {
  id: string;
  actor: "human" | "ai";
  type:
    | "created"
    | "drafted"
    | "reviewed"
    | "edited"
    | "accepted"
    | "rejected"
    | "resolved";
  message: string;
  createdAt: string;
};
```

---

## 11. State Management Plan

Use `useReducer` because document changes are event-driven and easy to explain.

Example reducer actions:

```ts
type Action =
  | { type: "GENERATE_DRAFT_START" }
  | { type: "GENERATE_DRAFT_SUCCESS"; sections: Section[] }
  | { type: "EDIT_SECTION"; sectionId: string; body: string }
  | { type: "RUN_REVIEW_START" }
  | {
      type: "RUN_REVIEW_SUCCESS";
      comments: Comment[];
      suggestions: Suggestion[];
    }
  | { type: "ACCEPT_SUGGESTION"; suggestionId: string }
  | { type: "REJECT_SUGGESTION"; suggestionId: string }
  | { type: "RESOLVE_COMMENT"; commentId: string };
```

Why `useReducer` is a good fit:

- All document changes are explicit.
- Accept/reject logic is centralized.
- Timeline events can be generated consistently.
- It is easier to test than scattered `useState` updates.

---

## 12. Mock AI Service

For the take-home, use mock async functions instead of a real LLM.

### Generate Draft

```ts
async function mockGenerateDraft(prompt: string): Promise<Section[]> {
  await sleep(800);

  return [
    {
      id: "problem",
      heading: "Problem",
      body:
        "Teams create documents using AI in one tool and then paste them into another tool for collaboration and review. This creates friction, context switching, and version drift.",
    },
    {
      id: "goals",
      heading: "Goals",
      body:
        "Unify AI drafting, review, and human collaboration in one workspace. Make AI suggestions visible, reviewable, and actionable.",
    },
    {
      id: "solution",
      heading: "Proposed Solution",
      body:
        "Build a collaborative editor where AI agents can draft content, critique it, and suggest improvements inline while humans retain final control.",
    },
    {
      id: "risks",
      heading: "Risks & Mitigations",
      body:
        "The product must avoid silent AI edits. Humans should always accept or reject AI-generated suggestions before they become part of the final document.",
    },
  ];
}
```

### Review Document

```ts
async function mockReviewDocument(document: Document) {
  await sleep(800);

  return {
    comments: [
      {
        id: "comment-1",
        sectionId: "goals",
        author: "ai",
        text:
          "Consider adding measurable success criteria. What does improved documentation quality mean for this project?",
        status: "open",
        createdAt: new Date().toISOString(),
      },
    ],
    suggestions: [
      {
        id: "suggestion-1",
        sectionId: "risks",
        originalText:
          "The product must avoid silent AI edits.",
        suggestedText:
          "The product must avoid silent AI edits by requiring human approval before AI-generated changes are applied to the document.",
        reason:
          "This makes the human decision boundary more explicit.",
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}
```

---

## 13. Implementation Steps

### Step 1: Build the Static Layout

Build the app shell first:

- Header
- Sidebar
- Editor
- AI panel
- Activity timeline

Goal:

- Make the product understandable before adding complex behavior.

---

### Step 2: Add Initial Document State

Create an initial document object with a title, sections, empty comments, empty suggestions, and timeline events.

Use `useReducer` to manage document state.

---

### Step 3: Add Mock Draft Generation

Add a prompt input in the AI panel.

When the user clicks **Generate Draft**:

1. Set loading state.
2. Call `mockGenerateDraft`.
3. Insert returned sections into the document.
4. Add an activity event.
5. Clear loading state.

---

### Step 4: Add Manual Editing

Allow users to edit section body text.

Simplest approach:

- Use `textarea` per section.
- Update section content on change.
- Add an edited event either on blur or after a save action.

For a take-home, a textarea-based editor is acceptable because the core product is the human/AI workflow, not rich-text editing.

---

### Step 5: Add Mock AI Review

When the user clicks **Run AI Review**:

1. Set reviewing state.
2. Call `mockReviewDocument`.
3. Add comments and suggestions to the document.
4. Display inline comments beside sections.
5. Display suggestions in the AI panel.
6. Add an activity event.

---

### Step 6: Add Accept / Reject Suggestions

When a user accepts a suggestion:

1. Find the target suggestion.
2. Find the related section.
3. Replace the matching text or update the section body.
4. Mark the suggestion as accepted.
5. Add an activity event.

When a user rejects a suggestion:

1. Mark the suggestion as rejected.
2. Leave document content unchanged.
3. Add an activity event.

---

### Step 7: Add Polish

Add UX details:

- Empty states
- Loading states
- Disabled buttons while AI is generating
- Badges for AI vs human authors
- Highlight pending suggestions
- Responsive layout
- Keyboard-friendly buttons
- Basic accessibility labels

---

## 14. UX Details to Highlight

### AI is visible as a collaborator

Show labels like:

- AI Drafted
- AI Suggested
- AI Reviewer
- Needs Human Review
- Accepted by Human

### Suggestions are reviewable

Do not silently rewrite the document.

Use clear actions:

- Accept
- Reject
- Ask to revise

### The document is the source of truth

The AI panel should support the document, not replace it.

### Human control is explicit

AI can propose and critique, but the human decides what becomes part of the final document.

---

## 15. Responsive Design Plan

### Desktop

Use a three-column layout:

```css
.app {
  display: grid;
  grid-template-columns: 260px 1fr 360px;
}
```

### Tablet

Collapse the sidebar:

```css
.app {
  grid-template-columns: 1fr 340px;
}
```

### Mobile

Use tabs or drawers:

- Editor tab
- AI tab
- Timeline tab

---

## 16. Demo Script

A strong take-home demo should show the full loop:

1. Open the empty workspace.
2. Enter prompt: “Create a technical design doc for AI document collaboration.”
3. Click **Generate Draft**.
4. AI generates structured sections.
5. User manually edits the Goals section.
6. User clicks **Run AI Review**.
7. AI adds comments and suggestions.
8. User accepts one suggestion.
9. User rejects another suggestion.
10. Activity timeline shows the full history.

This demonstrates:

- AI drafting
- AI reviewing
- Human editing
- Human decision-making
- Transparent collaboration history

---

## 17. README Structure

```md
# AI Collaborative Document Workspace

## Overview

A document editor where humans and AI agents can draft, review, and revise documents together.

## Problem

AI writing and human document review are often disconnected across tools.

## Solution

This product brings AI drafting, AI critique, and human decision-making into one shared document workspace.

## Features

- AI draft generation
- AI review comments
- Inline suggestions
- Accept/reject workflow
- Activity timeline
- Responsive layout

## Tech Stack

- React
- TypeScript
- CSS
- useReducer
- Mock async AI services

## How to Run

npm install
npm run dev

## Design Decisions

- The document is the source of truth.
- AI actions are visible and reviewable.
- Humans must approve AI suggestions.
- Mock AI is used to keep the take-home focused.
- Real-time collaboration is out of scope for the MVP.

## Future Improvements

- Real LLM integration
- Rich text editor
- Multiplayer collaboration
- Version diffing
- Permission model
- Export to Google Docs
```

---

## 18. What to Emphasize in the Interview

Emphasize that the product is not just:

> ChatGPT next to a text editor.

The stronger product idea is:

> A document-native workflow where AI actions become structured, reviewable collaboration events.

Key points:

- The document is the shared source of truth.
- AI suggestions are visible and reversible.
- Human approval is required.
- The timeline makes collaboration auditable.
- The MVP is intentionally scoped but demonstrates the full product loop.

---

## 19. Success Criteria

The take-home is successful if the reviewer can clearly see:

- A polished document workspace
- AI-generated draft content
- AI-generated review comments
- Human accept/reject controls
- Activity history
- Clean component architecture
- Clear state transitions
- Thoughtful product tradeoffs

The goal is not to build a full Google Docs clone. The goal is to show a complete human + AI authoring and review loop.
