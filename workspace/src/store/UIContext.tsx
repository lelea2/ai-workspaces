import { createContext, useContext, useState, type ReactNode } from 'react'

type UIContextValue = {
  sidebarOpen: boolean
  panelOpen: boolean
  toggleSidebar: () => void
  togglePanel: () => void
}

const UIContext = createContext<UIContextValue>({
  sidebarOpen: true,
  panelOpen: true,
  toggleSidebar: () => {},
  togglePanel: () => {},
})

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        panelOpen,
        toggleSidebar: () => setSidebarOpen((v) => !v),
        togglePanel: () => setPanelOpen((v) => !v),
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  return useContext(UIContext)
}
