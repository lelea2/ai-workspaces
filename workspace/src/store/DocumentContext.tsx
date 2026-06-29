import { createContext, useReducer, useEffect, useRef, useMemo, type ReactNode } from 'react'
import type { AppState, Document } from '../types'
import type { Action } from './actions'
import { documentReducer, initialState } from './documentReducer'
import { dataService } from '../services/data/dataService'

const STORAGE_KEY_DOCS = 'ai-workspace-docs'
const STORAGE_KEY_ACTIVE = 'ai-workspace-active'

function getUrlDocId(): string | null {
  return new URLSearchParams(window.location.search).get('doc')
}

function loadFromStorage(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOCS)
    if (!raw) return null
    const documents = JSON.parse(raw) as Document[]
    if (!documents.length) return null
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE) ?? documents[0].id
    const urlDocId = getUrlDocId()
    const activeDocumentId =
      urlDocId && documents.some((d) => d.id === urlDocId) ? urlDocId : activeId
    return { ...initialState, documents, activeDocumentId }
  } catch {
    return null
  }
}

type ContextValue = AppState & {
  activeDocument: Document | undefined
  dispatch: React.Dispatch<Action>
}

export const DocumentContext = createContext<ContextValue>({
  ...initialState,
  activeDocument: undefined,
  dispatch: () => {},
})

export function DocumentProvider({ children }: { children: ReactNode }) {
  const fromStorage = loadFromStorage()
  const [state, dispatch] = useReducer(
    documentReducer,
    undefined,
    () => fromStorage ?? initialState,
  )

  // Tracks the previous documents array for diffing in the sync effect.
  // initialized=false on the very first effect run so we record the baseline
  // without firing any server calls for data that already came from localStorage
  // or LOAD_INITIAL_DATA.
  const syncRef = useRef<{ initialized: boolean; prev: Document[] }>({
    initialized: false,
    prev: fromStorage?.documents ?? [],
  })

  // On first mount: if localStorage was empty, fetch seed data from server.
  // If localStorage has documents, reconcile them with the server so the
  // in-memory DB stays warm across server restarts.
  useEffect(() => {
    if (state.documents.length === 0) {
      // No local state — load from server
      dataService.getDocuments()
        .then((documents) => {
          if (!documents.length) return
          syncRef.current.prev = documents
          syncRef.current.initialized = true
          const urlDocId = getUrlDocId()
          const activeDocumentId =
            urlDocId && documents.some((d) => d.id === urlDocId)
              ? urlDocId
              : documents[0].id
          dispatch({ type: 'LOAD_INITIAL_DATA', documents, activeDocumentId })
        })
        .catch(() => {
          console.warn('[data] Could not load initial documents from server')
        })
    } else {
      // Local state exists — push it to the server so the in-memory DB is warm.
      // Use createDocument; 409 Conflict (already exists) is silently ignored.
      for (const doc of state.documents) {
        dataService.createDocument(doc).catch(() => {
          // 409 = server already has this doc (normal case, not a restart)
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist to localStorage on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(state.documents))
      localStorage.setItem(STORAGE_KEY_ACTIVE, state.activeDocumentId)
    } catch {
      // storage quota exceeded — silently ignore
    }
  }, [state.documents, state.activeDocumentId])

  // Forward mutations to the server in-memory DB (fire-and-forget).
  // Diffs current vs previous document list: new entries → POST, changed → PATCH.
  // The first run records the baseline without making any server calls.
  useEffect(() => {
    if (!syncRef.current.initialized) {
      syncRef.current.initialized = true
      syncRef.current.prev = state.documents
      return
    }
    const prev = syncRef.current.prev
    syncRef.current.prev = state.documents

    const currIds = new Set(state.documents.map((d) => d.id))
    for (const prevDoc of prev) {
      if (!currIds.has(prevDoc.id)) {
        dataService.deleteDocument(prevDoc.id).catch((err) =>
          console.error(`[data] DELETE /documents/${prevDoc.id} failed: ${err instanceof Error ? err.message : err}`)
        )
      }
    }

    for (const doc of state.documents) {
      const prevDoc = prev.find((d) => d.id === doc.id)
      if (!prevDoc) {
        dataService.createDocument(doc).catch((err) =>
          console.error(`[data] POST /documents failed: ${err instanceof Error ? err.message : err}`)
        )
      } else if (prevDoc !== doc) {
        dataService.updateDocument(doc.id, doc).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('not found')) {
            // Server lost state (restart) — recreate the document
            dataService.createDocument(doc).catch((e) =>
              console.error(`[data] POST /documents (fallback) failed: ${e instanceof Error ? e.message : e}`)
            )
          } else {
            console.error(`[data] PATCH /documents/${doc.id} failed: ${msg}`)
          }
        })
      }
    }
  }, [state.documents])

  // Keep URL in sync with active document
  useEffect(() => {
    if (!state.activeDocumentId) return
    const url = new URL(window.location.href)
    url.searchParams.set('doc', state.activeDocumentId)
    window.history.replaceState(null, '', url.toString())
  }, [state.activeDocumentId])

  const value = useMemo<ContextValue>(
    () => ({
      ...state,
      activeDocument: state.documents.find((d) => d.id === state.activeDocumentId),
      dispatch,
    }),
    [state],
  )

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>
}
