import { createContext, useReducer, useEffect, useMemo, type ReactNode } from 'react'
import type { AppState, Document } from '../types'
import type { Action } from './actions'
import { documentReducer, initialState } from './documentReducer'

const STORAGE_KEY_DOCS = 'ai-workspace-docs'
const STORAGE_KEY_ACTIVE = 'ai-workspace-active'

function getUrlDocId(): string | null {
  return new URLSearchParams(window.location.search).get('doc')
}

function loadState(): AppState {
  const urlDocId = getUrlDocId()
  try {
    const docs = localStorage.getItem(STORAGE_KEY_DOCS)
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE)
    if (docs) {
      const documents = JSON.parse(docs) as Document[]
      const resolvedActiveId =
        urlDocId && documents.some((d) => d.id === urlDocId)
          ? urlDocId
          : activeId ?? initialState.activeDocumentId
      return { ...initialState, documents, activeDocumentId: resolvedActiveId }
    }
  } catch {
    // corrupted storage — fall through to seed data
  }
  if (urlDocId && initialState.documents.some((d) => d.id === urlDocId)) {
    return { ...initialState, activeDocumentId: urlDocId }
  }
  return initialState
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
  const [state, dispatch] = useReducer(documentReducer, undefined, loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(state.documents))
      localStorage.setItem(STORAGE_KEY_ACTIVE, state.activeDocumentId)
    } catch {
      // storage quota exceeded — silently ignore
    }
  }, [state.documents, state.activeDocumentId])

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
