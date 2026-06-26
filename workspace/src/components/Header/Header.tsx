import { useState, useRef, useEffect, useCallback } from 'react'
import { useDocument } from '../../hooks/useDocument'
import { useAI } from '../../hooks/useAI'
import { useUI } from '../../store/UIContext'
import { formatRelativeTime } from '../../utils/time'
import type { DocumentStatus } from '../../types'

const STATUS_STYLE: Record<DocumentStatus, string> = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  reviewing: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
}

function SharePopup({
  docId,
  onClose,
}: {
  docId: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const url = `${window.location.origin}${window.location.pathname}?doc=${docId}`

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the input text
    }
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-900">Share document</p>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Anyone with this link can view this document (no login required).
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 outline-none font-mono truncate"
        />
        <button
          onClick={handleCopy}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
            copied
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="4" y="1" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M1 4h2M1 4v7h7v-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function Header() {
  const { activeDocument, isReviewing, isGenerating, dispatch } = useDocument()
  const { runReview } = useAI()
  const { sidebarOpen, panelOpen, toggleSidebar, togglePanel } = useUI()

  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const shareContainerRef = useRef<HTMLDivElement>(null)
  const closeShare = useCallback(() => setShareOpen(false), [])

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.select()
  }, [editingTitle])

  function startEditing() {
    if (!activeDocument) return
    setDraftTitle(activeDocument.title)
    setEditingTitle(true)
  }

  function commitTitle() {
    if (!activeDocument) { setEditingTitle(false); return }
    const trimmed = draftTitle.trim()
    if (trimmed && trimmed !== activeDocument.title) {
      dispatch({ type: 'UPDATE_DOCUMENT_TITLE', docId: activeDocument.id, title: trimmed })
    }
    setEditingTitle(false)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitTitle()
    if (e.key === 'Escape') setEditingTitle(false)
  }

  function handleRunReview() {
    if (!activeDocument || isReviewing || isGenerating) return
    runReview('Reviewer Agent')
  }

  const status = activeDocument?.status ?? 'draft'
  const savedAt = activeDocument ? formatRelativeTime(activeDocument.updatedAt) : ''

  return (
    <header className="flex items-center justify-between px-3 h-14 bg-white border-b border-gray-200 shrink-0 z-10 gap-2">
      {/* Left: sidebar toggle + logo */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5.5 2.5v11" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
        <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 4h10M3 8h7M3 12h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="font-semibold text-gray-900 text-sm hidden sm:block">AI Doc Workspace</span>
      </div>

      {/* Center: editable title + status */}
      <div className="flex-1 flex items-center justify-center gap-3 min-w-0 px-2">
        <div className="text-center min-w-0 max-w-sm">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={handleTitleKeyDown}
              className="text-sm font-semibold text-gray-900 text-center w-full bg-transparent border-b-2 border-blue-500 outline-none pb-0.5 leading-tight"
            />
          ) : (
            <button
              onClick={startEditing}
              disabled={!activeDocument}
              title="Click to rename"
              className="text-sm font-semibold text-gray-900 leading-tight truncate max-w-full hover:text-blue-600 transition-colors disabled:cursor-default disabled:hover:text-gray-900"
            >
              {activeDocument?.title ?? 'No document selected'}
            </button>
          )}
          {savedAt && (
            <p className="text-xs text-gray-400 mt-0.5">Saved {savedAt}</p>
          )}
        </div>
        {activeDocument && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 transition-colors ${STATUS_STYLE[status]} ${isReviewing ? 'animate-pulse' : ''}`}
          >
            {isGenerating ? 'Generating…' : status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )}
      </div>

      {/* Right: actions + panel toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Avatar group */}
        <div className="hidden md:flex -space-x-1.5 mr-1">
          {(['K', 'A', 'M'] as const).map((initial, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold text-white"
              style={{ backgroundColor: ['#6366f1', '#ec4899', '#14b8a6'][i] }}
            >
              {initial}
            </div>
          ))}
        </div>

        <div ref={shareContainerRef} className="relative hidden sm:block">
          <button
            onClick={() => setShareOpen((o) => !o)}
            disabled={!activeDocument}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              shareOpen
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM4.5 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM9.5 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" fill="currentColor" />
              <path d="M8.06 3.97L5.94 5.53M8.06 10.03L5.94 8.47" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Share
          </button>
          {shareOpen && activeDocument && (
            <SharePopup docId={activeDocument.id} onClose={closeShare} />
          )}
        </div>

        <button
          onClick={handleRunReview}
          disabled={!activeDocument || isReviewing || isGenerating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isReviewing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
              <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1.5" strokeDasharray="8 8" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5A5.5 5.5 0 1 0 12.5 7" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M10 4l2.5-2.5M12.5 1.5v3h-3" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span className="hidden sm:inline">{isReviewing ? 'Reviewing…' : 'Run AI Review'}</span>
        </button>

        {/* AI Panel toggle */}
        <button
          onClick={togglePanel}
          title={panelOpen ? 'Collapse AI panel' : 'Expand AI panel'}
          className={`p-1.5 rounded-md transition-colors ${panelOpen ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10.5 2.5v11" stroke="currentColor" strokeWidth="1.3" />
            <path d="M12.5 6l-1 2 1 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="4" r="1" fill="currentColor" />
            <circle cx="8" cy="8" r="1" fill="currentColor" />
            <circle cx="8" cy="12" r="1" fill="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  )
}
