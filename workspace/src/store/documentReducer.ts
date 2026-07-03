import type { AppState, Document, ActivityEvent, Reply, UserActor } from '../types'
import type { Action } from './actions'
import { lexicalReplaceText, isLexicalJson, plainTextToLexicalJson } from '../utils/lexical'

export const initialState: AppState = {
  documents: [],
  activeDocumentId: '',
  isGenerating: false,
  isReviewing: false,
  error: null,
}

const FALLBACK_ACTOR: UserActor = { id: '', name: 'User', color: '#6366f1', initial: 'U' }

let _evtSeq = 0
function makeEvent(partial: Omit<ActivityEvent, 'id' | 'createdAt'>): ActivityEvent {
  return { ...partial, id: `event-${Date.now()}-${++_evtSeq}`, createdAt: new Date().toISOString() }
}

function humanEvent(
  actor: UserActor | undefined,
  action: string,
  type: ActivityEvent['type'],
): ActivityEvent {
  const a = actor ?? FALLBACK_ACTOR
  return makeEvent({
    actor: a.name,
    actorId: a.id || undefined,
    actorType: 'human',
    actorColor: a.color,
    actorInitial: a.initial,
    action,
    type,
  })
}

function updateDoc(
  state: AppState,
  docId: string,
  updater: (doc: Document) => Document,
): AppState {
  return {
    ...state,
    documents: state.documents.map((d) => (d.id === docId ? updater(d) : d)),
  }
}

function recalcStatus(doc: Document): Document {
  const pending = doc.suggestions.some((s) => s.status === 'pending')
  if (!pending && doc.status === 'reviewing') {
    return { ...doc, status: 'approved' }
  }
  return doc
}

export function documentReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_DOCUMENT':
      return { ...state, activeDocumentId: action.id, error: null }

    case 'CREATE_DOCUMENT': {
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        title: action.title,
        ownerId: action.actor?.id || undefined,
        sharedWith: [],
        sections: action.sections,
        comments: [],
        suggestions: [],
        events: [humanEvent(action.actor, 'Created document', 'created')],
        status: 'draft',
        version: 1,
        updatedAt: new Date().toISOString(),
      }
      return {
        ...state,
        documents: [newDoc, ...state.documents],
        activeDocumentId: newDoc.id,
      }
    }

    case 'UPDATE_DOCUMENT_TITLE':
      return updateDoc(state, action.docId, (doc) => ({
        ...doc,
        title: action.title,
        updatedAt: new Date().toISOString(),
      }))

    case 'EDIT_SECTION':
      return updateDoc(state, action.docId, (doc) => ({
        ...doc,
        updatedAt: new Date().toISOString(),
        sections: doc.sections.map((s) =>
          s.id === action.sectionId ? { ...s, body: action.body } : s,
        ),
        events: [
          humanEvent(
            action.actor,
            `Edited ${doc.sections.find((s) => s.id === action.sectionId)?.heading ?? 'section'}`,
            'edited',
          ),
          ...doc.events,
        ],
      }))

    case 'GENERATE_DRAFT_START':
      return { ...updateDoc(state, action.docId, (doc) => ({ ...doc })), isGenerating: true, error: null }

    case 'GENERATE_DRAFT_SUCCESS':
      return {
        ...updateDoc(state, action.docId, (doc) => ({
          ...doc,
          sections: action.sections,
          status: 'draft',
          version: doc.version + 1,
          updatedAt: new Date().toISOString(),
          events: [
            makeEvent({
              actor: 'Drafting Agent',
              actorType: 'ai',
              actorColor: '#10b981',
              actorInitial: 'D',
              action: 'Generated draft',
              type: 'drafted',
            }),
            ...doc.events,
          ],
        })),
        isGenerating: false,
      }

    case 'RUN_REVIEW_START':
      return { ...updateDoc(state, action.docId, (doc) => ({ ...doc })), isReviewing: true, error: null }

    case 'RUN_REVIEW_SUCCESS':
      return {
        ...updateDoc(state, action.docId, (doc) => ({
          ...doc,
          comments: [...action.comments, ...doc.comments],
          suggestions: [...action.suggestions, ...doc.suggestions],
          status: 'reviewing',
          updatedAt: new Date().toISOString(),
          events: [
            makeEvent({
              actor: 'AI Reviewer',
              actorType: 'ai',
              actorColor: '#6366f1',
              actorInitial: 'R',
              action: `Added ${action.suggestions.length} suggestion${action.suggestions.length !== 1 ? 's' : ''}`,
              type: 'reviewed',
            }),
            ...doc.events,
          ],
        })),
        isReviewing: false,
      }

    case 'ACCEPT_SUGGESTION':
      return updateDoc(state, action.docId, (doc) => {
        const suggestion = doc.suggestions.find((s) => s.id === action.suggestionId)
        if (!suggestion) return doc

        const updatedSections = doc.sections.map((section) => {
          if (section.id !== suggestion.sectionId) return section
          let newBody: string
          if (action.aiBody !== undefined) {
            newBody = isLexicalJson(section.body)
              ? plainTextToLexicalJson(action.aiBody)
              : action.aiBody
          } else {
            newBody = lexicalReplaceText(section.body, suggestion.originalText, suggestion.suggestedText)
          }
          return { ...section, body: newBody }
        })

        const updatedDoc: Document = {
          ...doc,
          sections: updatedSections,
          suggestions: doc.suggestions.map((s) =>
            s.id === action.suggestionId ? { ...s, status: 'accepted' } : s,
          ),
          updatedAt: new Date().toISOString(),
          events: [
            humanEvent(action.actor, `Accepted suggestion in ${suggestion.sectionTitle}`, 'accepted'),
            ...doc.events,
          ],
        }
        return recalcStatus(updatedDoc)
      })

    case 'REJECT_SUGGESTION':
      return updateDoc(state, action.docId, (doc) => {
        const suggestion = doc.suggestions.find((s) => s.id === action.suggestionId)
        if (!suggestion) return doc

        const updatedDoc: Document = {
          ...doc,
          suggestions: doc.suggestions.map((s) =>
            s.id === action.suggestionId ? { ...s, status: 'rejected' } : s,
          ),
          updatedAt: new Date().toISOString(),
          events: [
            humanEvent(action.actor, `Dismissed suggestion in ${suggestion.sectionTitle}`, 'rejected'),
            ...doc.events,
          ],
        }
        return recalcStatus(updatedDoc)
      })

    case 'RESOLVE_COMMENT':
      return updateDoc(state, action.docId, (doc) => ({
        ...doc,
        comments: doc.comments.map((c) =>
          c.id === action.commentId ? { ...c, status: 'resolved' } : c,
        ),
        updatedAt: new Date().toISOString(),
        events: [
          humanEvent(action.actor, 'Resolved a comment', 'resolved'),
          ...doc.events,
        ],
      }))

    case 'ADD_COMMENT': {
      const section = state.documents
        .find((d) => d.id === action.docId)
        ?.sections.find((s) => s.id === action.sectionId)
      const a = action.actor ?? FALLBACK_ACTOR
      const newComment = {
        id: `comment-${Date.now()}`,
        sectionId: action.sectionId,
        author: 'human' as const,
        agentName: a.name,
        agentColor: a.color,
        agentInitial: a.initial,
        text: action.text,
        status: 'open' as const,
        createdAt: new Date().toISOString(),
        replies: [],
      }
      return updateDoc(state, action.docId, (doc) => ({
        ...doc,
        comments: [newComment, ...doc.comments],
        updatedAt: new Date().toISOString(),
        events: [
          humanEvent(action.actor, `Commented on ${section?.heading ?? 'a section'}`, 'commented'),
          ...doc.events,
        ],
      }))
    }

    case 'REPLY_TO_COMMENT': {
      const a = action.actor ?? FALLBACK_ACTOR
      const newReply: Reply = {
        id: `reply-${Date.now()}`,
        author: 'human',
        agentName: a.name,
        agentColor: a.color,
        agentInitial: a.initial,
        text: action.text,
        createdAt: new Date().toISOString(),
      }
      return updateDoc(state, action.docId, (doc) => ({
        ...doc,
        comments: doc.comments.map((c) =>
          c.id === action.commentId
            ? { ...c, replies: [...(c.replies ?? []), newReply] }
            : c,
        ),
        updatedAt: new Date().toISOString(),
        events: [
          humanEvent(action.actor, 'Replied to a comment', 'replied'),
          ...doc.events,
        ],
      }))
    }

    case 'AI_ERROR':
      return { ...state, isGenerating: false, isReviewing: false, error: action.error }

    case 'PUBLISH_DOCUMENT':
      return updateDoc(state, action.docId, (doc) => ({
        ...doc,
        status: 'reviewing',
        updatedAt: new Date().toISOString(),
        events: [
          humanEvent(action.actor, 'Published document', 'published'),
          ...doc.events,
        ],
      }))

    case 'SHARE_DOCUMENT':
      return updateDoc(state, action.docId, (doc) => ({
        ...doc,
        sharedWith: [...new Set([...(doc.sharedWith ?? []), action.userId])],
        updatedAt: new Date().toISOString(),
      }))

    case 'UNSHARE_DOCUMENT':
      return updateDoc(state, action.docId, (doc) => ({
        ...doc,
        sharedWith: (doc.sharedWith ?? []).filter((id) => id !== action.userId),
        updatedAt: new Date().toISOString(),
      }))

    case 'CLAIM_ORPHANED_DOCUMENTS': {
      const hasOrphaned = state.documents.some((d) => !d.ownerId)
      if (!hasOrphaned) return state
      return {
        ...state,
        documents: state.documents.map((d) =>
          !d.ownerId
            ? { ...d, ownerId: action.userId, sharedWith: d.sharedWith ?? [] }
            : d,
        ),
      }
    }

    case 'DELETE_DOCUMENT': {
      const remaining = state.documents.filter((d) => d.id !== action.docId)
      const activeDocumentId =
        state.activeDocumentId === action.docId
          ? (remaining[0]?.id ?? '')
          : state.activeDocumentId
      return { ...state, documents: remaining, activeDocumentId }
    }

    case 'LOAD_INITIAL_DATA':
      return { ...state, documents: action.documents, activeDocumentId: action.activeDocumentId }

    default:
      return state
  }
}
