// ── Server-side in-memory DB ──────────────────────────────────────────────────
// Single source of truth for documents, templates, and agent configs.
// Initialized at process start from seed data.
// Swap the store maps for a real DB (Postgres, SQLite) behind these same
// exported functions without touching any route or client code.

// ── Shared types (mirror of workspace/src/types/index.ts) ────────────────────

export type DocumentStatus = 'draft' | 'reviewing' | 'approved'

export type Section = {
  id: string
  heading: string
  body: string
}

export type Reply = {
  id: string
  author: 'human' | 'ai'
  agentName: string
  agentColor: string
  agentInitial: string
  text: string
  createdAt: string
}

export type Comment = {
  id: string
  sectionId: string
  author: 'human' | 'ai'
  agentName?: string
  agentColor?: string
  agentInitial?: string
  text: string
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
  replies?: Reply[]
}

export type Suggestion = {
  id: string
  sectionId: string
  sectionTitle: string
  originalText: string
  suggestedText: string
  reason: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export type ActivityEvent = {
  id: string
  actor: string
  actorType: 'human' | 'ai'
  actorColor: string
  actorInitial: string
  action: string
  type: 'created' | 'drafted' | 'reviewed' | 'edited' | 'accepted' | 'rejected' | 'resolved' | 'commented' | 'replied' | 'published'
  createdAt: string
}

export type Document = {
  id: string
  title: string
  sections: Section[]
  comments: Comment[]
  suggestions: Suggestion[]
  events: ActivityEvent[]
  status: DocumentStatus
  version: number
  updatedAt: string
}

export type AgentConfig = {
  id: string
  name: string
  color: string
  textColor: string
  bgLight: string
  initial: string
  prompt: string
  type: 'draft' | 'review'
}

type TemplateDef = {
  id: string
  name: string
  sections: Omit<Section, 'id'>[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ago(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString()
}

const MIN = 60_000
const HR = 3_600_000
const DAY = 86_400_000

// ── Seed documents ────────────────────────────────────────────────────────────

const SEED_DOCUMENTS: Document[] = [
  {
    id: 'doc-1',
    title: 'AI Document Collaboration – Technical Design Doc',
    status: 'reviewing',
    version: 3,
    updatedAt: ago(3 * MIN),
    sections: [
      {
        id: 'problem',
        heading: '1. Problem',
        body: 'Teams create documents using AI in one tool and then paste them into another for collaboration and review. This creates friction, context switching, and version drift.',
      },
      {
        id: 'goals',
        heading: '2. Goals',
        body: '• Unify AI drafting, review, and human collaboration in one workspace.\n• Make AI suggestions visible, reviewable, and actionable.\n• Preserve a clear history of decisions and changes.\n• Improve quality and speed of documentation.',
      },
      {
        id: 'solution',
        heading: '3. Proposed Solution',
        body: 'A collaborative editor where AI agents can draft content, critique it, and suggest improvements inline. Humans retain full control to accept or reject changes.',
      },
      {
        id: 'architecture',
        heading: '4. Architecture',
        body: 'Web App (React) → AI Service → Document Store (PostgreSQL)',
      },
      {
        id: 'risks',
        heading: '5. Risks & Mitigations',
        body: '• Ensure documents are encrypted and access is scoped.\n• Over-reliance on AI – Keep humans in the loop for final decisions.',
      },
    ],
    comments: [
      {
        id: 'comment-1',
        sectionId: 'goals',
        author: 'ai',
        agentName: 'AI Reviewer',
        agentColor: '#6366f1',
        agentInitial: 'R',
        text: 'Consider adding measurable success criteria. What does "improve quality and speed" mean for this project?',
        status: 'open',
        createdAt: ago(3 * MIN),
        replies: [],
      },
    ],
    suggestions: [
      {
        id: 'suggestion-1',
        sectionId: 'goals',
        sectionTitle: 'Goals',
        originalText: 'Improve quality and speed of documentation.',
        suggestedText: 'Improve documentation quality and speed by at least 30%, measured by time-to-publish and reviewer satisfaction scores.',
        reason: 'Add measurable success criteria.',
        status: 'pending',
        createdAt: ago(3 * MIN),
      },
      {
        id: 'suggestion-2',
        sectionId: 'risks',
        sectionTitle: 'Risks & Mitigations',
        originalText: 'Ensure documents are encrypted and access is scoped.',
        suggestedText: 'Ensure documents are encrypted at rest and in transit, access is role-scoped, and all access events are logged for audit.',
        reason: 'Security section is too vague. Consider adding access controls and audit logs.',
        status: 'pending',
        createdAt: ago(3 * MIN),
      },
      {
        id: 'suggestion-3',
        sectionId: 'architecture',
        sectionTitle: 'Architecture',
        originalText: 'Web App (React) → AI Service → Document Store (PostgreSQL)',
        suggestedText: 'Web App (React) → AI Service → Document Store (PostgreSQL). Documents are persisted with row-level security. AI responses are cached per document version.',
        reason: 'Explain how data persistence is handled.',
        status: 'pending',
        createdAt: ago(3 * MIN),
      },
      {
        id: 'suggestion-4',
        sectionId: 'solution',
        sectionTitle: 'Proposed Solution',
        originalText: 'Humans retain full control to accept or reject changes.',
        suggestedText: 'Humans retain full control to accept or reject changes. For example, a Reviewer Agent might suggest tightening the scope section; the human can accept with one click.',
        reason: 'Add examples of the AI review workflow.',
        status: 'pending',
        createdAt: ago(3 * MIN),
      },
    ],
    events: [
      {
        id: 'event-1',
        actor: 'AI Reviewer',
        actorType: 'ai',
        actorColor: '#6366f1',
        actorInitial: 'R',
        action: 'Added 4 suggestions',
        type: 'reviewed',
        createdAt: ago(3 * MIN),
      },
      {
        id: 'event-2',
        actor: 'Khanh',
        actorType: 'human',
        actorColor: '#6366f1',
        actorInitial: 'K',
        action: 'Edited Goals section',
        type: 'edited',
        createdAt: ago(5 * MIN),
      },
      {
        id: 'event-3',
        actor: 'Drafting Agent',
        actorType: 'ai',
        actorColor: '#10b981',
        actorInitial: 'D',
        action: 'Created initial draft',
        type: 'drafted',
        createdAt: ago(10 * MIN),
      },
      {
        id: 'event-4',
        actor: 'Khanh',
        actorType: 'human',
        actorColor: '#6366f1',
        actorInitial: 'K',
        action: 'Created document',
        type: 'created',
        createdAt: ago(15 * MIN),
      },
    ],
  },

  {
    id: 'doc-2',
    title: 'Product Requirements – v2',
    status: 'draft',
    version: 1,
    updatedAt: ago(5 * HR),
    sections: [
      { id: 'overview', heading: '1. Overview', body: 'This document outlines the product requirements for v2 of the AI Document Workspace.' },
      { id: 'goals', heading: '2. Goals', body: 'Define the feature set and success criteria for the v2 release.' },
      { id: 'requirements', heading: '3. Requirements', body: '' },
      { id: 'out-of-scope', heading: '4. Out of Scope', body: '' },
    ],
    comments: [],
    suggestions: [],
    events: [
      {
        id: 'event-1',
        actor: 'Khanh',
        actorType: 'human',
        actorColor: '#6366f1',
        actorInitial: 'K',
        action: 'Created document',
        type: 'created',
        createdAt: ago(5 * HR),
      },
    ],
  },

  {
    id: 'doc-3',
    title: 'Security Review – Q2',
    status: 'approved',
    version: 2,
    updatedAt: ago(DAY),
    sections: [
      { id: 'scope', heading: '1. Scope', body: 'This review covers the authentication, authorization, and data storage components of the platform.' },
      { id: 'findings', heading: '2. Findings', body: 'No critical vulnerabilities found. Two medium-severity issues were addressed and closed.' },
      { id: 'recommendations', heading: '3. Recommendations', body: 'Enable MFA for all admin accounts. Review session timeout policies quarterly.' },
      { id: 'sign-off', heading: '4. Sign-off', body: 'Approved by Security Lead on 2024-06-15.' },
    ],
    comments: [],
    suggestions: [],
    events: [
      {
        id: 'event-1',
        actor: 'Khanh',
        actorType: 'human',
        actorColor: '#6366f1',
        actorInitial: 'K',
        action: 'Approved document',
        type: 'accepted',
        createdAt: ago(DAY),
      },
      {
        id: 'event-2',
        actor: 'AI Reviewer',
        actorType: 'ai',
        actorColor: '#6366f1',
        actorInitial: 'R',
        action: 'Completed security review',
        type: 'reviewed',
        createdAt: ago(DAY + HR),
      },
    ],
  },

  {
    id: 'doc-4',
    title: 'Project Plan – Phoenix',
    status: 'reviewing',
    version: 1,
    updatedAt: ago(2 * DAY),
    sections: [
      { id: 'objectives', heading: '1. Objectives', body: 'Launch the Phoenix platform by Q3 with full API coverage and a functional dashboard.' },
      { id: 'timeline', heading: '2. Timeline', body: 'Q1: Design\nQ2: Development\nQ3: Launch' },
      { id: 'team', heading: '3. Team', body: 'Engineering: 3 engineers\nDesign: 1 designer\nPM: 1 product manager' },
      { id: 'risks', heading: '4. Risks', body: 'Resource availability may impact Q3 timeline.' },
    ],
    comments: [],
    suggestions: [
      {
        id: 'suggestion-1',
        sectionId: 'timeline',
        sectionTitle: 'Timeline',
        originalText: 'Q1: Design\nQ2: Development\nQ3: Launch',
        suggestedText: 'Q1: Design + Prototyping\nQ2: Core Development + Testing\nQ3: Beta + Launch',
        reason: 'Add more detail to each phase to clarify deliverables.',
        status: 'pending',
        createdAt: ago(2 * DAY),
      },
      {
        id: 'suggestion-2',
        sectionId: 'risks',
        sectionTitle: 'Risks',
        originalText: 'Resource availability may impact Q3 timeline.',
        suggestedText: 'Resource availability may impact Q3 timeline. Mitigation: identify backup contractors by end of Q2.',
        reason: 'Risk needs a concrete mitigation plan.',
        status: 'pending',
        createdAt: ago(2 * DAY),
      },
    ],
    events: [
      {
        id: 'event-1',
        actor: 'AI Reviewer',
        actorType: 'ai',
        actorColor: '#6366f1',
        actorInitial: 'R',
        action: 'Added 2 suggestions',
        type: 'reviewed',
        createdAt: ago(2 * DAY),
      },
      {
        id: 'event-2',
        actor: 'Khanh',
        actorType: 'human',
        actorColor: '#6366f1',
        actorInitial: 'K',
        action: 'Created document',
        type: 'created',
        createdAt: ago(2 * DAY + HR),
      },
    ],
  },

  {
    id: 'doc-5',
    title: 'Launch Plan – v1.0',
    status: 'draft',
    version: 1,
    updatedAt: ago(3 * DAY),
    sections: [
      { id: 'overview', heading: '1. Overview', body: 'Launch plan for v1.0 of the product.' },
      { id: 'checklist', heading: '2. Launch Checklist', body: '' },
      { id: 'rollback', heading: '3. Rollback Plan', body: '' },
    ],
    comments: [],
    suggestions: [],
    events: [
      {
        id: 'event-1',
        actor: 'Khanh',
        actorType: 'human',
        actorColor: '#6366f1',
        actorInitial: 'K',
        action: 'Created document',
        type: 'created',
        createdAt: ago(3 * DAY),
      },
    ],
  },

  {
    id: 'doc-6',
    title: 'Incident Review 2024-05',
    status: 'approved',
    version: 1,
    updatedAt: ago(5 * DAY),
    sections: [
      { id: 'summary', heading: '1. Incident Summary', body: 'On 2024-05-12, a database connection pool exhaustion caused 4 minutes of downtime.' },
      { id: 'timeline', heading: '2. Timeline', body: '14:02 – Alert triggered\n14:06 – On-call engineer paged\n14:10 – Root cause identified\n14:23 – Service restored' },
      { id: 'root-cause', heading: '3. Root Cause', body: 'A misconfigured connection limit in the staging environment was promoted to production.' },
      { id: 'action-items', heading: '4. Action Items', body: '• Add connection pool monitoring alerts.\n• Block staging config from being promoted without review.' },
    ],
    comments: [],
    suggestions: [],
    events: [
      {
        id: 'event-1',
        actor: 'Khanh',
        actorType: 'human',
        actorColor: '#6366f1',
        actorInitial: 'K',
        action: 'Approved document',
        type: 'accepted',
        createdAt: ago(5 * DAY),
      },
    ],
  },
]

// ── Seed templates ────────────────────────────────────────────────────────────

const SEED_TEMPLATES: TemplateDef[] = [
  {
    id: 'tpl-product-spec',
    name: 'Product Spec',
    sections: [
      {
        heading: '1. Overview',
        body: 'What is this product or feature and why are we building it?\n\n[Describe the problem being solved and the proposed solution in 2-3 sentences.]',
      },
      {
        heading: '2. Goals',
        body: '• [Primary goal — what does success look like?]\n• [Secondary goal]\n• [Metric to measure success]',
      },
      {
        heading: '3. Requirements',
        body: '## Functional Requirements\n• [Requirement 1]\n• [Requirement 2]\n\n## Non-functional Requirements\n• [Performance: e.g., p99 < 200ms]\n• [Availability: e.g., 99.9% uptime]',
      },
      {
        heading: '4. Out of Scope',
        body: 'The following are explicitly excluded from this release:\n• [Item 1 — reason]\n• [Item 2 — reason]',
      },
    ],
  },
  {
    id: 'tpl-tech-design',
    name: 'Technical Design Doc',
    sections: [
      {
        heading: '1. Problem Statement',
        body: 'Describe the problem this design solves. Include context, constraints, and why existing solutions fall short.',
      },
      {
        heading: '2. Goals & Success Metrics',
        body: '• [Primary goal]\n• [Secondary goal]\n\nSuccess measured by: [define KPIs, targets, and measurement timeline].',
      },
      {
        heading: '3. Proposed Solution',
        body: 'High-level description of the solution approach and key design decisions.',
      },
      {
        heading: '4. Architecture',
        body: '[Client] → [API Layer] → [Service] → [Database]\n\nKey components:\n• [Component A] — handles [responsibility]\n• [Component B] — manages [responsibility]',
      },
      {
        heading: '5. Risks & Mitigations',
        body: '• Risk: [describe risk]. Mitigation: [describe mitigation].\n• Risk: Scope creep. Mitigation: Lock requirements by [date].',
      },
    ],
  },
  {
    id: 'tpl-security',
    name: 'Security Review',
    sections: [
      {
        heading: '1. Scope',
        body: 'Systems, services, and data in scope for this review:\n• [System/service 1]\n• [System/service 2]',
      },
      {
        heading: '2. Threat Model',
        body: 'Potential threat actors:\n• [Actor 1]: motivation [describe]\n\nAttack vectors:\n• [Vector 1]: [describe]',
      },
      {
        heading: '3. Findings',
        body: '## Critical\n• [Finding 1] — [description]\n\n## High\n• [Finding 1] — [description]\n\n## Medium\n• [Finding 1] — [description]',
      },
      {
        heading: '4. Recommendations',
        body: '• [ ] [Recommendation 1] — Priority: High, Owner: [team]\n• [ ] [Recommendation 2] — Priority: Medium, Owner: [team]',
      },
      {
        heading: '5. Sign-off',
        body: 'Security team approval: [pending]\nReviewed by: [name]\nDate: [date]',
      },
    ],
  },
  {
    id: 'tpl-project-plan',
    name: 'Project Plan',
    sections: [
      {
        heading: '1. Objectives',
        body: '• [Objective 1 — measurable outcome]\n• [Objective 2 — measurable outcome]',
      },
      {
        heading: '2. Timeline',
        body: '• Phase 1: [start date] – [end date] — [description]\n• Phase 2: [start date] – [end date] — [description]\n• Launch: [target date]',
      },
      {
        heading: '3. Team',
        body: '• Project Lead: [name]\n• Engineering: [names]\n• Design: [name]\n• Stakeholders: [names]',
      },
      {
        heading: '4. Risks',
        body: '• Risk: [describe]. Likelihood: [H/M/L]. Impact: [H/M/L]. Mitigation: [describe].',
      },
    ],
  },
  {
    id: 'tpl-incident',
    name: 'Incident Review',
    sections: [
      {
        heading: '1. Summary',
        body: 'Incident: [brief title]\nSeverity: [P0/P1/P2]\nDuration: [start] – [end] ([total duration])\nImpact: [who/what was affected and how]',
      },
      {
        heading: '2. Timeline',
        body: '[HH:MM] — [Event description]\n[HH:MM] — [Event description]\n[HH:MM] — Incident resolved.',
      },
      {
        heading: '3. Root Cause',
        body: 'The root cause of this incident was [describe the underlying cause, not just the symptom].',
      },
      {
        heading: '4. Action Items',
        body: '• [ ] [Action item] — Owner: [name], Due: [date]\n• [ ] [Action item] — Owner: [name], Due: [date]',
      },
      {
        heading: '5. Lessons Learned',
        body: '## What went well\n• [Item]\n\n## What can be improved\n• [Item]',
      },
    ],
  },
]

// ── Seed agent configs ────────────────────────────────────────────────────────

const SEED_AGENTS: AgentConfig[] = [
  {
    id: 'drafting',
    name: 'Drafting Agent',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    bgLight: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    initial: 'D',
    prompt: 'Create a [document type] for [describe your project or feature]',
    type: 'draft',
  },
  {
    id: 'reviewer',
    name: 'Reviewer Agent',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgLight: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    initial: 'R',
    prompt: 'Review this document for clarity, completeness, and any missing sections.',
    type: 'review',
  },
  {
    id: 'security',
    name: 'Security Agent',
    color: 'bg-rose-500',
    textColor: 'text-rose-700',
    bgLight: 'bg-rose-50 border-rose-200 hover:bg-rose-100',
    initial: 'S',
    prompt: 'Review this document for security risks, access control gaps, and audit requirements.',
    type: 'review',
  },
  {
    id: 'clarity',
    name: 'Clarity Agent',
    color: 'bg-violet-500',
    textColor: 'text-violet-700',
    bgLight: 'bg-violet-50 border-violet-200 hover:bg-violet-100',
    initial: 'C',
    prompt: 'Improve the clarity and readability of this document. Flag any vague or ambiguous sections.',
    type: 'review',
  },
  {
    id: 'risk',
    name: 'Technical Risk Agent',
    color: 'bg-amber-500',
    textColor: 'text-amber-700',
    bgLight: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
    initial: 'T',
    prompt: 'Identify technical risks, dependencies, and potential failure modes in this design.',
    type: 'review',
  },
]

// ── In-memory store ───────────────────────────────────────────────────────────

const documents = new Map<string, Document>(
  SEED_DOCUMENTS.map((d) => [d.id, structuredClone(d)]),
)

const templates = new Map<string, TemplateDef>(
  SEED_TEMPLATES.map((t) => [t.id, t]),
)

const agents = new Map<string, AgentConfig>(
  SEED_AGENTS.map((a) => [a.id, a]),
)

export const INITIAL_ACTIVE_ID = 'doc-1'

// ── Document accessors ────────────────────────────────────────────────────────

export function getDocuments(): Document[] {
  return [...documents.values()]
}

export function getDocument(id: string): Document | undefined {
  return documents.get(id)
}

export function createDocument(doc: Document): void {
  documents.set(doc.id, structuredClone(doc))
}

export function updateDocument(id: string, patch: Partial<Document>): boolean {
  const existing = documents.get(id)
  if (!existing) return false
  documents.set(id, { ...existing, ...patch, id })
  return true
}

export function deleteDocument(id: string): boolean {
  return documents.delete(id)
}

// ── Template accessors ────────────────────────────────────────────────────────

export function getTemplates(): { id: string; name: string }[] {
  return [...templates.values()].map((t) => ({ id: t.id, name: t.name }))
}

export function buildTemplateSections(templateId: string): Section[] {
  const def = templates.get(templateId)
  if (!def) return []
  const t = Date.now()
  return def.sections.map((s, i) => ({ ...s, id: `s-${t}-${i}` }))
}

export function saveTemplate(name: string, sections: { heading: string; body: string }[]): { id: string; name: string } {
  const id = `tpl-${Date.now()}`
  templates.set(id, { id, name, sections })
  return { id, name }
}

export function updateTemplate(id: string, patch: { name?: string }): boolean {
  const existing = templates.get(id)
  if (!existing) return false
  templates.set(id, { ...existing, ...patch })
  return true
}

export function deleteTemplate(id: string): boolean {
  return templates.delete(id)
}

// ── Agent accessors ───────────────────────────────────────────────────────────

export function getAgents(): AgentConfig[] {
  return [...agents.values()]
}
