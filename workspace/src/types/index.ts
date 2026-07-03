export type DocumentStatus = 'draft' | 'reviewing' | 'approved'

export type User = {
  id: string
  name: string
  initial: string
  color: string
}

export type UserActor = {
  id: string
  name: string
  color: string
  initial: string
}

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
  actorId?: string
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
  ownerId?: string
  sharedWith?: string[]
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

export type AppState = {
  documents: Document[]
  activeDocumentId: string
  isGenerating: boolean
  isReviewing: boolean
  error: string | null
}
