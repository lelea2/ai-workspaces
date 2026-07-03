import type { Section, Comment, Suggestion, Document, UserActor } from '../types'

export type Action =
  | { type: 'SET_ACTIVE_DOCUMENT'; id: string }
  | { type: 'CREATE_DOCUMENT'; title: string; sections: Section[]; actor?: UserActor }
  | { type: 'UPDATE_DOCUMENT_TITLE'; docId: string; title: string }
  | { type: 'EDIT_SECTION'; docId: string; sectionId: string; body: string; actor?: UserActor }
  | { type: 'GENERATE_DRAFT_START'; docId: string }
  | { type: 'GENERATE_DRAFT_SUCCESS'; docId: string; sections: Section[] }
  | { type: 'RUN_REVIEW_START'; docId: string }
  | { type: 'RUN_REVIEW_SUCCESS'; docId: string; comments: Comment[]; suggestions: Suggestion[] }
  | { type: 'ACCEPT_SUGGESTION'; docId: string; suggestionId: string; aiBody?: string; actor?: UserActor }
  | { type: 'REJECT_SUGGESTION'; docId: string; suggestionId: string; actor?: UserActor }
  | { type: 'RESOLVE_COMMENT'; docId: string; commentId: string; actor?: UserActor }
  | { type: 'ADD_COMMENT'; docId: string; sectionId: string; text: string; actor?: UserActor }
  | { type: 'REPLY_TO_COMMENT'; docId: string; commentId: string; text: string; actor?: UserActor }
  | { type: 'AI_ERROR'; docId: string; error: string }
  | { type: 'PUBLISH_DOCUMENT'; docId: string; actor?: UserActor }
  | { type: 'DELETE_DOCUMENT'; docId: string }
  | { type: 'SHARE_DOCUMENT'; docId: string; userId: string }
  | { type: 'UNSHARE_DOCUMENT'; docId: string; userId: string }
  | { type: 'CLAIM_ORPHANED_DOCUMENTS'; userId: string }
  | { type: 'LOAD_INITIAL_DATA'; documents: Document[]; activeDocumentId: string }
