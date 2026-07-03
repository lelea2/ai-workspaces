import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type UIContextValue = {
  sidebarOpen: boolean
  panelOpen: boolean
  darkMode: boolean
  focusCommentId: string | null
  toggleSidebar: () => void
  togglePanel: () => void
  openPanel: () => void
  toggleDarkMode: () => void
  focusComment: (id: string) => void
  clearFocusComment: () => void
}

const UIContext = createContext<UIContextValue>({
  sidebarOpen: true,
  panelOpen: true,
  darkMode: false,
  focusCommentId: null,
  toggleSidebar: () => {},
  togglePanel: () => {},
  openPanel: () => {},
  toggleDarkMode: () => {},
  focusComment: () => {},
  clearFocusComment: () => {},
})

function getInitialDarkMode(): boolean {
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') return true
    if (stored === 'light') return false
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(getInitialDarkMode)
  const [focusCommentId, setFocusCommentId] = useState<string | null>(null)

  useEffect(() => {
    const html = document.documentElement
    if (darkMode) {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const openPanel = useCallback(() => setPanelOpen(true), [])
  const toggleDarkMode = useCallback(() => setDarkMode((v) => !v), [])
  const focusComment = useCallback((id: string) => setFocusCommentId(id), [])
  const clearFocusComment = useCallback(() => setFocusCommentId(null), [])

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        panelOpen,
        darkMode,
        focusCommentId,
        toggleSidebar: () => setSidebarOpen((v) => !v),
        togglePanel: () => setPanelOpen((v) => !v),
        openPanel,
        toggleDarkMode,
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
