import { useState, useRef, useEffect } from 'react'
import { AGENTS } from '../../data/agentPrompts'
import { useDocument } from '../../hooks/useDocument'
import { useAI } from '../../hooks/useAI'
import { useUI } from '../../store/UIContext'
import { formatRelativeTime } from '../../utils/time'
import type { Suggestion, Comment } from '../../types'
import type { Action } from '../../store/actions'

// ---------- Suggestion card ----------

function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: Suggestion
  onAccept: () => void
  onDismiss: () => void
}) {
  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        suggestion.status === 'accepted'
          ? 'bg-green-50 border-green-200'
          : suggestion.status === 'rejected'
          ? 'bg-gray-50 border-gray-200 opacity-60'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide leading-tight">
          {suggestion.sectionTitle}
        </span>
        <span className="text-[10px] text-gray-400 shrink-0">
          {formatRelativeTime(suggestion.createdAt)}
        </span>
      </div>

      <p className="text-xs text-gray-700 leading-relaxed mb-1">{suggestion.reason}</p>

      {suggestion.status === 'pending' ? (
        <div className="flex gap-1.5 mt-2.5">
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Accept
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 3l4 4M7 3L3 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Dismiss
          </button>
        </div>
      ) : (
        <div className="flex items-center mt-2">
          {suggestion.status === 'accepted' ? (
            <span className="text-[11px] font-medium text-green-600 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Applied to document
            </span>
          ) : (
            <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M3 3l4 4M7 3L3 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Dismissed
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Comment list item ----------

function CommentItem({
  comment,
  docId,
  dispatch,
}: {
  comment: Comment
  docId: string
  dispatch: React.Dispatch<Action>
}) {
  const [expanded, setExpanded] = useState(false)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const replyRef = useRef<HTMLTextAreaElement>(null)
  const replies = comment.replies ?? []

  useEffect(() => {
    if (replying) replyRef.current?.focus()
  }, [replying])

  function handlePostReply() {
    const trimmed = replyText.trim()
    if (!trimmed) return
    dispatch({ type: 'REPLY_TO_COMMENT', docId, commentId: comment.id, text: trimmed })
    setReplyText('')
    setReplying(false)
  }

  function handleReplyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handlePostReply()
    }
    if (e.key === 'Escape') {
      setReplying(false)
      setReplyText('')
    }
  }

  function handleResolve() {
    dispatch({ type: 'RESOLVE_COMMENT', docId, commentId: comment.id })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: comment.agentColor ?? '#6366f1' }}
          >
            {comment.agentInitial ?? 'A'}
          </div>
          <span className="text-xs font-semibold text-gray-700 truncate">{comment.agentName ?? 'AI'}</span>
          <span className="text-[10px] text-gray-400 ml-auto shrink-0">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>
        <p className={`text-xs text-gray-600 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
          {comment.text}
        </p>
        {!expanded && replies.length > 0 && (
          <p className="text-[10px] text-indigo-500 mt-1 font-medium">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </p>
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {/* Replies */}
          {replies.length > 0 && (
            <div className="px-3 py-2 space-y-2 border-b border-gray-100">
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-1.5">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: reply.agentColor }}
                  >
                    {reply.agentInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-semibold text-gray-700">{reply.agentName}</span>
                      <span className="text-[10px] text-gray-400">{formatRelativeTime(reply.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{reply.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply compose */}
          {replying && (
            <div className="px-3 py-2 border-b border-gray-100">
              <textarea
                ref={replyRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleReplyKeyDown}
                placeholder="Write a reply… (⌘↵ to send)"
                rows={2}
                className="w-full text-xs border border-indigo-300 rounded-md px-2 py-1.5 resize-none outline-none focus:ring-1 focus:ring-indigo-400 placeholder-gray-300 leading-relaxed"
              />
              <div className="flex gap-1.5 mt-1.5">
                <button
                  onClick={handlePostReply}
                  disabled={!replyText.trim()}
                  className="flex-1 py-1 text-[11px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-40"
                >
                  Post
                </button>
                <button
                  onClick={() => { setReplying(false); setReplyText('') }}
                  className="flex-1 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!replying && (
            <div className="flex gap-2 px-3 py-1.5">
              <button
                onClick={() => setReplying(true)}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                Reply
              </button>
              <button
                onClick={handleResolve}
                className="ml-auto text-[11px] font-medium text-gray-500 hover:text-green-600 flex items-center gap-0.5 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Resolve
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Suggestion skeleton ----------

function SuggestionSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[80, 100, 90].map((w, i) => (
        <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
          <div className="flex justify-between mb-2">
            <div className="h-2.5 bg-gray-200 rounded" style={{ width: `${w}px` }} />
            <div className="h-2.5 bg-gray-200 rounded w-14" />
          </div>
          <div className="h-2.5 bg-gray-200 rounded w-full mb-1.5" />
          <div className="h-2.5 bg-gray-200 rounded mb-4" style={{ width: '80%' }} />
          <div className="flex gap-2">
            <div className="h-7 bg-gray-200 rounded flex-1" />
            <div className="h-7 bg-gray-200 rounded flex-1" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- Empty suggestions state ----------

function EmptySuggestions() {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-center">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300 mb-2">
        <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-xs text-gray-400">Run a review to get suggestions</p>
    </div>
  )
}

// ---------- All-approved state ----------

function AllApprovedState() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center border border-green-200 bg-green-50 rounded-lg px-4">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-green-500 mb-2">
        <path d="M14 2C7.373 2 2 7.373 2 14s5.373 12 12 12 12-5.373 12-12S20.627 2 14 2zm-1 17l-5-5 1.41-1.41L13 16.17l7.59-7.59L22 10l-9 9z" fill="currentColor" />
      </svg>
      <p className="text-xs font-semibold text-green-700 mb-0.5">Document approved</p>
      <p className="text-xs text-green-600">All suggestions have been resolved</p>
    </div>
  )
}

// ---------- Loading spinner ----------

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 8" />
    </svg>
  )
}

// ---------- AIPanel ----------

export default function AIPanel() {
  const { activeDocument, isGenerating, isReviewing, dispatch } = useDocument()
  const { generateDraft, runReview } = useAI()
  const { panelOpen } = useUI()

  if (!panelOpen) return null

  const [activeAgentId, setActiveAgentId] = useState('reviewer')
  const [prompt, setPrompt] = useState(AGENTS.find((a) => a.id === 'reviewer')!.prompt)
  const [activeTab, setActiveTab] = useState<'suggestions' | 'comments'>('suggestions')

  const activeAgent = AGENTS.find((a) => a.id === activeAgentId)!
  const isLoading = isGenerating || isReviewing

  const suggestions: Suggestion[] = activeDocument?.suggestions ?? []
  const openComments: Comment[] = activeDocument?.comments.filter((c) => c.status === 'open') ?? []
  const pendingCount = suggestions.filter((s) => s.status === 'pending').length

  function handleAgentSelect(agentId: string) {
    const agent = AGENTS.find((a) => a.id === agentId)
    if (!agent) return
    setActiveAgentId(agentId)
    setPrompt(agent.prompt)
  }

  function handleSubmit() {
    if (!activeDocument || isLoading || !prompt.trim()) return
    if (activeAgent.type === 'draft') {
      generateDraft(prompt)
    } else {
      runReview(activeAgent.name)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleAccept(suggestion: Suggestion) {
    if (!activeDocument) return
    dispatch({ type: 'ACCEPT_SUGGESTION', docId: activeDocument.id, suggestionId: suggestion.id })
  }

  function handleDismiss(suggestion: Suggestion) {
    if (!activeDocument) return
    dispatch({ type: 'REJECT_SUGGESTION', docId: activeDocument.id, suggestionId: suggestion.id })
  }

  const canSubmit = !!activeDocument && !isLoading && !!prompt.trim()

  return (
    <aside className="w-90 shrink-0 flex flex-col bg-white overflow-hidden">
      {/* Panel header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">AI Assistant</h2>

        {/* Agent selector */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">Select an agent</p>
          <div className="flex flex-wrap gap-1.5">
            {AGENTS.map((agent) => {
              const isActive = activeAgentId === agent.id
              return (
                <button
                  key={agent.id}
                  onClick={() => handleAgentSelect(agent.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    isActive
                      ? `${agent.bgLight} ${agent.textColor} border-current`
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full ${agent.color} flex items-center justify-center text-[9px] font-bold text-white`}
                  >
                    {agent.initial}
                  </span>
                  {agent.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Prompt box */}
        <div className="relative">
          <p className="text-xs text-gray-500 mb-1.5">Ask the {activeAgent.name}</p>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              disabled={isLoading}
              placeholder="Type your instructions…"
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 pr-10 resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              title="Submit (⌘↵)"
              className="absolute right-2 bottom-2 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Spinner />
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
          {isLoading && (
            <p className="text-[11px] text-blue-500 mt-1.5 flex items-center gap-1">
              <Spinner />
              {isGenerating ? 'Generating draft…' : 'Running review…'}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 shrink-0">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'suggestions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Suggestions
          {pendingCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'comments'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Comments
          {openComments.length > 0 && (
            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {openComments.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'suggestions' && (
          <div className="space-y-2">
            {isReviewing && <SuggestionSkeleton />}
            {!isReviewing && suggestions.length === 0 && <EmptySuggestions />}
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={() => handleAccept(suggestion)}
                onDismiss={() => handleDismiss(suggestion)}
              />
            ))}
            {!isReviewing &&
              suggestions.length > 0 &&
              suggestions.every((s) => s.status !== 'pending') &&
              activeDocument?.status === 'approved' && (
                <AllApprovedState />
              )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-2">
            {openComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300 mb-2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-xs text-gray-400">No open comments</p>
              </div>
            ) : (
              openComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  docId={activeDocument!.id}
                  dispatch={dispatch}
                />
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
