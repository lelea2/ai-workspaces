import type { Section } from '../types'

type TemplateDef = {
  id: string
  name: string
  sections: Omit<Section, 'id'>[]
}

const TEMPLATE_DEFS: TemplateDef[] = [
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

export const TEMPLATES = TEMPLATE_DEFS.map((t) => ({ id: t.id, name: t.name }))

export function buildTemplateSections(templateId: string): Section[] {
  const def = TEMPLATE_DEFS.find((t) => t.id === templateId)
  if (!def) return []
  const t = Date.now()
  return def.sections.map((s, i) => ({ ...s, id: `s-${t}-${i}` }))
}
