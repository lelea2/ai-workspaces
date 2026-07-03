import { useState, useEffect } from 'react'
import { DocumentProvider } from './store/DocumentContext'
import { UIProvider } from './store/UIContext'
import { useDocument } from './hooks/useDocument'
import Header from './components/Header/Header'
import Sidebar from './components/Sidebar/Sidebar'
import Editor from './components/Editor/Editor'
import AIPanel from './components/AIPanel/AIPanel'
import Timeline from './components/Timeline/Timeline'

function ErrorToast() {
  const { error } = useDocument()
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!error) return
    setMessage(error)
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(t)
  }, [error])

  if (!visible || !message) return null

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-600 dark:bg-red-700 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 5v4M8 11h.01" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M7.134 2.5L1.5 13h13L8.866 2.5a1 1 0 0 0-1.732 0z" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <span>{message}</span>
      <button
        onClick={() => setVisible(false)}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 3l8 8M11 3L3 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

function AppShell() {
  return (
    <>
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden min-w-0">
          <Sidebar />
          <Editor />
          <AIPanel />
        </div>
        <Timeline />
      </div>
      <ErrorToast />
    </>
  )
}

export default function App() {
  return (
    <DocumentProvider>
      <UIProvider>
        <AppShell />
      </UIProvider>
    </DocumentProvider>
  )
}
