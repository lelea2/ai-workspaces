import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type UIContextValue = {
  sidebarOpen: boolean
  panelOpen: boolean
  // When set, AIPanel should switch to the Comments tab, scroll to this comment,
  // and auto-trigger "Fix by Agent" for it. Cleared by AIPanel after consuming.
  focusCommentId: string | null
  toggleSidebar: () => void
  togglePanel: () => void
  openPanel: () => void
  focusComment: (id: string) => void
  clearFocusComment: () => void
}

const UIContext = createContext<UIContextValue>({
  sidebarOpen: true,
  panelOpen: true,
  focusCommentId: null,
  toggleSidebar: () => {},
  togglePanel: () => {},
  openPanel: () => {},
  focusComment: () => {},
  clearFocusComment: () => {},
})

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [focusCommentId, setFocusCommentId] = useState<string | null>(null)

  const openPanel = useCallback(() => setPanelOpen(true), [])
  const focusComment = useCallback((id: string) => setFocusCommentId(id), [])
  const clearFocusComment = useCallback(() => setFocusCommentId(null), [])

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        panelOpen,
        focusCommentId,
        toggleSidebar: () => setSidebarOpen((v) => !v),
        togglePanel: () => setPanelOpen((v) => !v),
        openPanel,
        focusComment,
        clearFocusComment,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  return useContext(UIContext)
}
