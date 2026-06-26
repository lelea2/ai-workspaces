import type { Document } from '../types'
import { now } from '../utils/time'

const MIN = 60_000
const HR = 3_600_000
const DAY = 86_400_000

export const seedDocuments: Document[] = [
  {
    id: 'doc-1',
    title: 'AI Document Collaboration – Technical Design Doc',
    status: 'reviewing',
    version: 3,
    updatedAt: now(3 * MIN),
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
        createdAt: now(3 * MIN),
      },
    ],
    suggestions: [
      {
        id: 'suggestion-1',
        sectionId: 'goals',
        sectionTitle: 'Goals',
        originalText: 'Improve quality and speed of documentation.',
        suggestedText:
          'Improve documentation quality and speed by at least 30%, measured by time-to-publish and reviewer satisfaction scores.',
        reason: 'Add measurable success criteria.',
        status: 'pending',
        createdAt: now(3 * MIN),
      },
      {
        id: 'suggestion-2',
        sectionId: 'risks',
        sectionTitle: 'Risks & Mitigations',
        originalText: 'Ensure documents are encrypted and access is scoped.',
        suggestedText:
          'Ensure documents are encrypted at rest and in transit, access is role-scoped, and all access events are logged for audit.',
        reason: 'Security section is too vague. Consider adding access controls and audit logs.',
        status: 'pending',
        createdAt: now(3 * MIN),
      },
      {
        id: 'suggestion-3',
        sectionId: 'architecture',
        sectionTitle: 'Architecture',
        originalText: 'Web App (React) → AI Service → Document Store (PostgreSQL)',
        suggestedText:
          'Web App (React) → AI Service → Document Store (PostgreSQL). Documents are persisted with row-level security. AI responses are cached per document version.',
        reason: 'Explain how data persistence is handled.',
        status: 'pending',
        createdAt: now(3 * MIN),
      },
      {
        id: 'suggestion-4',
        sectionId: 'solution',
        sectionTitle: 'Proposed Solution',
        originalText: 'Humans retain full control to accept or reject changes.',
        suggestedText:
          'Humans retain full control to accept or reject changes. For example, a Reviewer Agent might suggest tightening the scope section; the human can accept with one click.',
        reason: 'Add examples of the AI review workflow.',
        status: 'pending',
        createdAt: now(3 * MIN),
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
        createdAt: now(3 * MIN),
      },
      {
        id: 'event-2',
        actor: 'Khanh',
        actorType: 'human',
        actorColor: '#6366f1',
        actorInitial: 'K',
        action: 'Edited Goals section',
        type: 'edited',
        createdAt: now(5 * MIN),
      },
      {
        id: 'event-3',
        actor: 'Drafting Agent',
        actorType: 'ai',
        actorColor: '#10b981',
        actorInitial: 'D',
        action: 'Created initial draft',
        type: 'drafted',
        createdAt: now(10 * MIN),
      },
      {
        id: 'event-4',
        actor: 'Khanh',
        actorType: 'human',
        actorColor: '#6366f1',
        actorInitial: 'K',
        action: 'Created document',
        type: 'created',
        createdAt: now(15 * MIN),
      },
    ],
  },

  {
    id: 'doc-2',
    title: 'Product Requirements – v2',
    status: 'draft',
    version: 1,
    updatedAt: now(5 * HR),
    sections: [
      {
        id: 'overview',
        heading: '1. Overview',
        body: 'This document outlines the product requirements for v2 of the AI Document Workspace.',
      },
      {
        id: 'goals',
        heading: '2. Goals',
        body: 'Define the feature set and success criteria for the v2 release.',
      },
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
        createdAt: now(5 * HR),
      },
    ],
  },

  {
    id: 'doc-3',
    title: 'Security Review – Q2',
    status: 'approved',
    version: 2,
    updatedAt: now(DAY),
    sections: [
      {
        id: 'scope',
        heading: '1. Scope',
        body: 'This review covers the authentication, authorization, and data storage components of the platform.',
      },
      {
        id: 'findings',
        heading: '2. Findings',
        body: 'No critical vulnerabilities found. Two medium-severity issues were addressed and closed.',
      },
      {
        id: 'recommendations',
        heading: '3. Recommendations',
        body: 'Enable MFA for all admin accounts. Review session timeout policies quarterly.',
      },
      {
        id: 'sign-off',
        heading: '4. Sign-off',
        body: 'Approved by Security Lead on 2024-06-15.',
      },
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
        createdAt: now(DAY),
      },
      {
        id: 'event-2',
        actor: 'AI Reviewer',
        actorType: 'ai',
        actorColor: '#6366f1',
        actorInitial: 'R',
        action: 'Completed security review',
        type: 'reviewed',
        createdAt: now(DAY + HR),
      },
    ],
  },

  {
    id: 'doc-4',
    title: 'Project Plan – Phoenix',
    status: 'reviewing',
    version: 1,
    updatedAt: now(2 * DAY),
    sections: [
      {
        id: 'objectives',
        heading: '1. Objectives',
        body: 'Launch the Phoenix platform by Q3 with full API coverage and a functional dashboard.',
      },
      {
        id: 'timeline',
        heading: '2. Timeline',
        body: 'Q1: Design\nQ2: Development\nQ3: Launch',
      },
      {
        id: 'team',
        heading: '3. Team',
        body: 'Engineering: 3 engineers\nDesign: 1 designer\nPM: 1 product manager',
      },
      {
        id: 'risks',
        heading: '4. Risks',
        body: 'Resource availability may impact Q3 timeline.',
      },
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
        createdAt: now(2 * DAY),
      },
      {
        id: 'suggestion-2',
        sectionId: 'risks',
        sectionTitle: 'Risks',
        originalText: 'Resource availability may impact Q3 timeline.',
        suggestedText:
          'Resource availability may impact Q3 timeline. Mitigation: identify backup contractors by end of Q2.',
        reason: 'Risk needs a concrete mitigation plan.',
        status: 'pending',
        createdAt: now(2 * DAY),
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
        createdAt: now(2 * DAY),
      },
      {
        id: 'event-2',
        actor: 'Khanh',
        actorType: 'human',
        actorColor: '#6366f1',
        actorInitial: 'K',
        action: 'Created document',
        type: 'created',
        createdAt: now(2 * DAY + HR),
      },
    ],
  },

  {
    id: 'doc-5',
    title: 'Launch Plan – v1.0',
    status: 'draft',
    version: 1,
    updatedAt: now(3 * DAY),
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
        createdAt: now(3 * DAY),
      },
    ],
  },

  {
    id: 'doc-6',
    title: 'Incident Review 2024-05',
    status: 'approved',
    version: 1,
    updatedAt: now(5 * DAY),
    sections: [
      {
        id: 'summary',
        heading: '1. Incident Summary',
        body: 'On 2024-05-12, a database connection pool exhaustion caused 4 minutes of downtime.',
      },
      {
        id: 'timeline',
        heading: '2. Timeline',
        body: '14:02 – Alert triggered\n14:06 – On-call engineer paged\n14:10 – Root cause identified\n14:23 – Service restored',
      },
      {
        id: 'root-cause',
        heading: '3. Root Cause',
        body: 'A misconfigured connection limit in the staging environment was promoted to production.',
      },
      {
        id: 'action-items',
        heading: '4. Action Items',
        body: '• Add connection pool monitoring alerts.\n• Block staging config from being promoted without review.',
      },
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
        createdAt: now(5 * DAY),
      },
    ],
  },
]

export const INITIAL_ACTIVE_ID = 'doc-1'
