import { useState, useRef, useEffect, useCallback } from 'react'
import { useDocument } from '../../hooks/useDocument'
import { useAI } from '../../hooks/useAI'
import { useUI } from '../../store/UIContext'
import { useUser } from '../../store/UserContext'
import { formatRelativeTime } from '../../utils/time'
import { dataService } from '../../services/data/dataService'
import { exportAsMarkdown, exportAsPDF } from '../../utils/export'
import { extractPlainText } from '../../utils/lexical'
import type { DocumentStatus, Section, User } from '../../types'

const STATUS_STYLE: Record<DocumentStatus, string> = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
  reviewing: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800',
  approved: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800',
}

function Avatar({ user, size = 7, ring = true }: { user: User; size?: number; ring?: boolean }) {
  const sizeClass = size === 7 ? 'w-7 h-7 text-xs' : size === 8 ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-[10px]'
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shrink-0 ${ring ? 'ring-2 ring-white dark:ring-gray-900' : ''}`}
      style={{ backgroundColor: user.color }}
      title={user.name}
    >
      {user.initial}
    </div>
  )
}

function ShareModal({
  docId,
  ownerId,
  sharedWith,
  allUsers,
  onClose,
  onShare,
  onUnshare,
}: {
  docId: string
  ownerId?: string
  sharedWith: string[]
  allUsers: User[]
  onClose: () => void
  onShare: (userId: string) => void
  onUnshare: (userId: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}${window.location.pathname}?doc=${docId}`

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  async function handleCopy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const owner = allUsers.find((u) => u.id === ownerId)
  const others = allUsers.filter((u) => u.id !== ownerId)

  return (
    <div
      ref={containerRef}
      className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg dark:shadow-black/30 p-4 z-50"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Share document</p>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>

      {/* Copy link */}
      <div className="flex items-center gap-2 mb-4">
        <input readOnly value={url} onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-2 outline-none font-mono truncate"
        />
        <button onClick={handleCopy}
          className={`shrink-0 px-3 py-2 text-xs font-medium rounded-lg transition-all ${copied ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Team access */}
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Team access</p>
      <div className="space-y-1.5">
        {owner && (
          <div className="flex items-center gap-2.5 px-1 py-1">
            <Avatar user={owner} size={7} ring={false} />
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{owner.name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">owner</span>
          </div>
        )}
        {others.map((user) => {
          const hasAccess = sharedWith.includes(user.id)
          return (
            <div key={user.id} className="flex items-center gap-2.5 px-1 py-1">
              <Avatar user={user} size={7} ring={false} />
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{user.name}</span>
              <button
                onClick={() => hasAccess ? onUnshare(user.id) : onShare(user.id)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                  hasAccess
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400'
                    : 'text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
                title={hasAccess ? `Remove ${user.name}'s access` : `Give ${user.name} access`}
              >
                {hasAccess ? 'Access ✓' : '+ Invite'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type DraftSection = { key: string; heading: string; body: string }

function SaveTemplateModal({
  defaultName,
  initialSections,
  onSave,
  onClose,
}: {
  defaultName: string
  initialSections: { heading: string; body: string }[]
  onSave: (name: string, sections: { heading: string; body: string }[]) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(defaultName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sections, setSections] = useState<DraftSection[]>(() =>
    initialSections.length > 0
      ? initialSections.map((s, i) => ({ key: String(i), heading: s.heading, body: s.body }))
      : [{ key: '0', heading: 'Section 1', body: '' }]
  )
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.select()
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function addSection() {
    setSections((prev) => [
      ...prev,
      { key: String(Date.now()), heading: `Section ${prev.length + 1}`, body: '' },
    ])
  }

  function removeSection(key: string) {
    setSections((prev) => prev.filter((s) => s.key !== key))
  }

  function updateSection(key: string, field: 'heading' | 'body', value: string) {
    setSections((prev) => prev.map((s) => s.key === key ? { ...s, [field]: value } : s))
  }

  async function handleSave() {
    if (!name.trim() || saving || sections.length === 0) return
    setSaving(true)
    try {
      await onSave(name.trim(), sections.map(({ heading, body }) => ({ heading, body })))
      setSaved(true)
      setTimeout(onClose, 1200)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 px-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl dark:shadow-black/50 flex flex-col max-h-[82vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Save as template</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Customize sections before saving as a reusable template</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Template name */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Template name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              placeholder="Template name"
              className="w-full text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-600"
            />
          </div>

          {/* Sections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                Sections <span className="text-gray-300 dark:text-gray-600">({sections.length})</span>
              </label>
            </div>
            <div className="space-y-2.5">
              {sections.map((section, idx) => (
                <div key={section.key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={section.heading}
                      onChange={(e) => updateSection(section.key, 'heading', e.target.value)}
                      placeholder="Section heading"
                      className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200 bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-600"
                    />
                    {sections.length > 1 && (
                      <button
                        onClick={() => removeSection(section.key)}
                        title="Remove section"
                        className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </button>
                    )}
                  </div>
                  <textarea
                    value={section.body}
                    onChange={(e) => updateSection(section.key, 'body', e.target.value)}
                    placeholder="Section content (optional placeholder text for this template)"
                    rows={3}
                    className="w-full text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 px-3 py-2.5 outline-none resize-none placeholder-gray-300 dark:placeholder-gray-700 leading-relaxed"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addSection}
              className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Add section
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving || sections.length === 0}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              saved ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CurrentUserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={`Signed in as ${user.name}`}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: user.color }}
        >
          {user.initial}
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-400 dark:text-gray-600">
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg dark:shadow-black/30 py-1 z-50">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-50">{user.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-600">Signed in</p>
          </div>
          <button
            onClick={() => { setOpen(false); onLogout() }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v7A1.5 1.5 0 0 0 2.5 12H5M9.5 9.5L13 7l-3.5-2.5M13 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Switch user
          </button>
        </div>
      )}
    </div>
  )
}

function ExportMenu({
  title,
  sections,
}: {
  title: string
  sections: Section[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Export document"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md transition-colors ${
          open
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600'
            : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v7M4.5 5.5L7 8l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 10v1.5A1.5 1.5 0 0 0 3.5 13h7A1.5 1.5 0 0 0 12 11.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        Export
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg dark:shadow-black/30 py-1 z-50">
          <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wide">Download as</p>
          <button
            onClick={() => { exportAsMarkdown(title, sections); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1.5 2h9v8h-9zM3 4.5h2M3 6.5h6M3 8.5h4" stroke="#6366f1" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
            </span>
            <div className="text-left">
              <p className="font-medium leading-tight">Markdown</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 leading-tight">.md file</p>
            </div>
          </button>
          <button
            onClick={() => { exportAsPDF(title, sections); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1.5" y="1" width="9" height="10" rx="1.5" stroke="#e11d48" strokeWidth="1.1" />
                <path d="M3.5 4h5M3.5 6h5M3.5 8h3" stroke="#e11d48" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
            </span>
            <div className="text-left">
              <p className="font-medium leading-tight">PDF</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 leading-tight">via browser print</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const { activeDocument, isReviewing, isGenerating, dispatch } = useDocument()
  const { runReview } = useAI()
  const { sidebarOpen, panelOpen, darkMode, toggleSidebar, togglePanel, toggleDarkMode } = useUI()
  const { currentUser, allUsers, logout } = useUser()

  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const shareContainerRef = useRef<HTMLDivElement>(null)
  const saveTemplateContainerRef = useRef<HTMLDivElement>(null)
  const closeShare = useCallback(() => setShareOpen(false), [])
  const closeSaveTemplate = useCallback(() => setSaveTemplateOpen(false), [])

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

  async function handleSaveTemplate(name: string, sections: { heading: string; body: string }[]) {
    await dataService.saveTemplate(name, sections.map((s, i) => ({ id: `section-${i + 1}`, ...s })))
    window.dispatchEvent(new CustomEvent('templates-changed'))
  }

  function handleShare(userId: string) {
    if (!activeDocument) return
    dispatch({ type: 'SHARE_DOCUMENT', docId: activeDocument.id, userId })
    dataService.shareDocument(activeDocument.id, userId).catch(() => {})
  }

  function handleUnshare(userId: string) {
    if (!activeDocument) return
    dispatch({ type: 'UNSHARE_DOCUMENT', docId: activeDocument.id, userId })
    dataService.unshareDocument(activeDocument.id, userId).catch(() => {})
  }

  // Build collaborator list: owner first, then shared users
  const docOwner = activeDocument?.ownerId ? allUsers.find((u) => u.id === activeDocument.ownerId) : undefined
  const sharedUsers = (activeDocument?.sharedWith ?? [])
    .map((id) => allUsers.find((u) => u.id === id))
    .filter((u): u is User => !!u)
  const collaborators: User[] = [
    ...(docOwner ? [docOwner] : []),
    ...sharedUsers.filter((u) => u.id !== docOwner?.id),
  ]

  const status = activeDocument?.status ?? 'draft'
  const savedAt = activeDocument ? formatRelativeTime(activeDocument.updatedAt) : ''

  return (
    <header className="flex items-center justify-between px-3 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 z-10 gap-2">
      {/* Left: sidebar toggle + logo */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
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
        <span className="font-semibold text-gray-900 dark:text-gray-50 text-sm hidden sm:block">AI Doc Workspace</span>
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
              className="text-sm font-semibold text-gray-900 dark:text-gray-50 text-center w-full bg-transparent border-b-2 border-blue-500 outline-none pb-0.5 leading-tight"
            />
          ) : (
            <button
              onClick={startEditing}
              disabled={!activeDocument}
              title="Click to rename"
              className="text-sm font-semibold text-gray-900 dark:text-gray-50 leading-tight truncate max-w-full hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:cursor-default disabled:hover:text-gray-900 dark:disabled:hover:text-gray-50"
            >
              {activeDocument?.title ?? 'No document selected'}
            </button>
          )}
          {savedAt && (
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">Saved {savedAt}</p>
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

      {/* Right: collaborators + actions + panel toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Collaborator avatar stack */}
        {activeDocument && collaborators.length > 0 && (
          <div className="hidden md:flex -space-x-1.5 mr-1">
            {collaborators.slice(0, 4).map((user) => (
              <Avatar key={user.id} user={user} size={7} ring />
            ))}
            {collaborators.length > 4 && (
              <div className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                +{collaborators.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Save template */}
        <div ref={saveTemplateContainerRef} className="relative hidden sm:block">
          <button
            onClick={() => { setSaveTemplateOpen((o) => !o); setShareOpen(false) }}
            disabled={!activeDocument}
            title="Save as template"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              saveTemplateOpen
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700'
                : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M3.5 5h7M3.5 7.5h5M3.5 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Save template
          </button>
          {saveTemplateOpen && activeDocument && (
            <SaveTemplateModal
              defaultName={activeDocument.title}
              initialSections={(activeDocument.sections as Section[]).map((s) => ({
                heading: s.heading,
                body: extractPlainText(s.body),
              }))}
              onSave={handleSaveTemplate}
              onClose={closeSaveTemplate}
            />
          )}
        </div>

        {/* Export */}
        {activeDocument && activeDocument.sections.length > 0 && (
          <ExportMenu
            title={activeDocument.title}
            sections={activeDocument.sections as Section[]}
          />
        )}

        {/* Share */}
        <div ref={shareContainerRef} className="relative hidden sm:block">
          <button
            onClick={() => { setShareOpen((o) => !o); setSaveTemplateOpen(false) }}
            disabled={!activeDocument}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              shareOpen
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700'
                : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM4.5 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM9.5 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" fill="currentColor" />
              <path d="M8.06 3.97L5.94 5.53M8.06 10.03L5.94 8.47" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Share
          </button>
          {shareOpen && activeDocument && (
            <ShareModal
              docId={activeDocument.id}
              ownerId={activeDocument.ownerId}
              sharedWith={activeDocument.sharedWith ?? []}
              allUsers={allUsers}
              onClose={closeShare}
              onShare={handleShare}
              onUnshare={handleUnshare}
            />
          )}
        </div>

        {/* Run AI Review */}
        <button
          onClick={handleRunReview}
          disabled={!activeDocument || isReviewing || isGenerating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          className={`p-1.5 rounded-md transition-colors ${
            panelOpen
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-950'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10.5 2.5v11" stroke="currentColor" strokeWidth="1.3" />
            <path d="M12.5 6l-1 2 1 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          {darkMode ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Current user menu */}
        {currentUser && (
          <CurrentUserMenu user={currentUser} onLogout={logout} />
        )}
      </div>
    </header>
  )
}
