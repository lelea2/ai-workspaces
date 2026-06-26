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

export const AGENTS: AgentConfig[] = [
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
