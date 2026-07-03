import { useState, useRef, useEffect } from 'react'
import { useDocument } from '../../hooks/useDocument'
import { dataService } from '../../services/data/dataService'
import type { AgentConfig } from '../../types'
import { useAI } from '../../hooks/useAI'
import { useUI } from '../../store/UIContext'
import { formatRelativeTime } from '../../utils/time'
import type { Suggestion, Comment } from '../../types'
import type { Action } from '../../store/actions'
import { diffLines } from '../../utils/diff'
import { extractPlainText } from '../../utils/lexical'

// ---------- Suggestion card ----------

function SuggestionCard({
  suggestion,
  originalBody,
  onAccept,
  onDismiss,
  onApprove,
  onDiscard,
  isApplying = false,
  streamingBody,
  pendingBody,
}: {
  suggestion: Suggestion
  originalBody: string
  onAccept: () => void
  onDismiss: () => void
  onApprove: () => void
  onDiscard: () => void
  isApplying?: boolean
  streamingBody?: string
  pendingBody?: string
}) {
  const hasPending = pendingBody !== undefined && !isApplying
  const chunks = hasPending ? diffLines(originalBody, pendingBody) : []
  const hasChanges = chunks.some((c) => c.type !== 'equal')

  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        suggestion.status === 'accepted'
          ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800'
          : suggestion.status === 'rejected'
          ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
          : hasPending
          ? 'bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-800'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide leading-tight">
          {suggestion.sectionTitle}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-gray-600 shrink-0">
          {formatRelativeTime(suggestion.createdAt)}
        </span>
      </div>

      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-1">{suggestion.reason}</p>

      {/* Live streaming typewriter preview */}
      {isApplying && (
        <div className="mt-2 mb-2 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide mb-1 flex items-center gap-1">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="animate-pulse">
              <circle cx="4" cy="4" r="4" fill="currentColor" />
            </svg>
            AI rewriting…
          </p>
          <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed whitespace-pre-wrap">
            {streamingBody ?? ''}
            <span className="inline-block w-0.5 h-3 bg-blue-400 ml-0.5 animate-pulse align-middle" />
          </p>
        </div>
      )}

      {/* Diff view — awaiting user approval */}
      {hasPending && (
        <div className="mt-2 mb-2 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-[11px] font-mono leading-relaxed">
          <div className="bg-gray-50 dark:bg-gray-800 px-2.5 py-1 border-b border-gray-200 dark:border-gray-700 text-[10px] font-sans font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide">
            Review changes
          </div>
          <div className="max-h-48 overflow-y-auto px-2.5 py-1.5 space-y-px">
            {hasChanges ? chunks.map((chunk, i) => (
              <div
                key={i}
                className={`px-1 rounded-sm whitespace-pre-wrap ${
                  chunk.type === 'delete'
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 line-through'
                    : chunk.type === 'insert'
                    ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-500'
                }`}
              >
                <span className="select-none mr-1 opacity-50">
                  {chunk.type === 'delete' ? '−' : chunk.type === 'insert' ? '+' : ' '}
                </span>
                {chunk.text || <span className="opacity-30">{'(empty line)'}</span>}
              </div>
            )) : (
              <p className="text-gray-400 dark:text-gray-600 px-1 py-1">No textual changes detected.</p>
            )}
          </div>
        </div>
      )}

      {suggestion.status === 'pending' && !hasPending ? (
        <div className="flex gap-1.5 mt-2.5">
          <button
            onClick={onAccept}
            disabled={isApplying}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-md hover:bg-green-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isApplying ? (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="animate-spin">
                  <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
                </svg>
                Rewriting…
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Accept
              </>
            )}
          </button>
          <button
            onClick={onDismiss}
            disabled={isApplying}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 3l4 4M7 3L3 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Dismiss
          </button>
        </div>
      ) : suggestion.status === 'pending' && hasPending ? (
        <div className="flex gap-1.5 mt-2.5">
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium text-white bg-green-600 border border-green-700 rounded-md hover:bg-green-700 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Approve &amp; apply
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 flex items-center justify-center gap-1 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 3l4 4M7 3L3 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Discard
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
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-600 flex items-center gap-1">
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
  isFixing = false,
  streamingBody,
  pendingFix,
  onFixByAgent,
  onApproveFix,
  onAbortFix,
}: {
  comment: Comment
  docId: string
  dispatch: React.Dispatch<Action>
  isFixing?: boolean
  streamingBody?: string
  pendingFix?: { sectionId: string; originalBody: string; newBody: string }
  onFixByAgent?: () => void
  onApproveFix?: () => void
  onAbortFix?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const replyRef = useRef<HTMLTextAreaElement>(null)
  const replies = comment.replies ?? []

  // Auto-expand when fix is in progress so the user can see the preview
  useEffect(() => {
    if (isFixing || pendingFix) setExpanded(true)
  }, [isFixing, pendingFix])

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

  const fixDiffChunks = pendingFix ? diffLines(pendingFix.originalBody, pendingFix.newBody) : []

  return (
    <div data-comment-id={comment.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: comment.agentColor ?? '#6366f1' }}
          >
            {comment.agentInitial ?? 'A'}
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{comment.agentName ?? 'AI'}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-600 ml-auto shrink-0">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>
        <p className={`text-xs text-gray-600 dark:text-gray-400 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
          {comment.text}
        </p>
        {!expanded && replies.length > 0 && (
          <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-1 font-medium">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </p>
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {/* Replies */}
          {replies.length > 0 && (
            <div className="px-3 py-2 space-y-2 border-b border-gray-100 dark:border-gray-800">
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
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{reply.agentName}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-600">{formatRelativeTime(reply.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{reply.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Streaming preview — agent is generating the fix */}
          {isFixing && (
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 mb-1.5 flex items-center gap-1">
                <Spinner />
                Agent is writing a fix…
              </p>
              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-md px-2.5 py-2 text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed font-mono whitespace-pre-wrap min-h-10">
                {streamingBody ?? ''}
                <span className="inline-block w-0.5 h-3 bg-indigo-400 ml-0.5 animate-pulse align-text-bottom" />
              </div>
            </div>
          )}

          {/* Diff preview — awaiting user decision */}
          {!isFixing && pendingFix && (
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-500 mb-1.5">Proposed change — review before applying:</p>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-2 text-[11px] font-mono leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                {fixDiffChunks.map((chunk, i) => {
                  if (chunk.type === 'equal') return <span key={i} className="text-gray-500 dark:text-gray-500">{chunk.text}</span>
                  if (chunk.type === 'delete') return <span key={i} className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 line-through">{chunk.text}</span>
                  return <span key={i} className="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400">{chunk.text}</span>
                })}
              </div>
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={onApproveFix}
                  className="flex-1 py-1.5 text-[11px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                >
                  Apply fix
                </button>
                <button
                  onClick={onAbortFix}
                  className="flex-1 py-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Reply compose */}
          {replying && (
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <textarea
                ref={replyRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleReplyKeyDown}
                placeholder="Write a reply… (⌘↵ to send)"
                rows={2}
                className="w-full text-xs border border-indigo-300 rounded-md px-2 py-1.5 resize-none outline-none focus:ring-1 focus:ring-indigo-400 placeholder-gray-300 dark:placeholder-gray-600 leading-relaxed"
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
                  className="flex-1 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!replying && !isFixing && !pendingFix && (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <button
                onClick={() => setReplying(true)}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                Reply
              </button>
              <button
                onClick={onFixByAgent}
                disabled={isFixing}
                className="text-[11px] text-indigo-600 hover:underline font-medium flex items-center gap-0.5 disabled:opacity-40"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1v2M5 7v2M1 5h2M7 5h2M2.5 2.5l1.5 1.5M6 6l1.5 1.5M2.5 7.5L4 6M6 4l1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Fix by Agent
              </button>
              <button
                onClick={handleResolve}
                className="ml-auto text-[11px] font-medium text-gray-500 dark:text-gray-500 hover:text-green-600 flex items-center gap-0.5 transition-colors"
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
        <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between mb-2">
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded" style={{ width: `${w}px` }} />
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-14" />
          </div>
          <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1.5" />
          <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded mb-4" style={{ width: '80%' }} />
          <div className="flex gap-2">
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300 dark:text-gray-600 mb-2">
        <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-xs text-gray-400 dark:text-gray-600">Run a review to get suggestions</p>
    </div>
  )
}

// ---------- All-approved state ----------

function AllApprovedState() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 rounded-lg px-4">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-green-500 mb-2">
        <path d="M14 2C7.373 2 2 7.373 2 14s5.373 12 12 12 12-5.373 12-12S20.627 2 14 2zm-1 17l-5-5 1.41-1.41L13 16.17l7.59-7.59L22 10l-9 9z" fill="currentColor" />
      </svg>
      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-0.5">Document approved</p>
      <p className="text-xs text-green-600 dark:text-green-400">All suggestions have been resolved</p>
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
  const { generateDraft, runReview, acceptSuggestion, applyAcceptedSuggestion, fixCommentByAgent, applyCommentFix } = useAI()
  const { panelOpen, focusCommentId, clearFocusComment } = useUI()

  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [activeAgentId, setActiveAgentId] = useState('reviewer')
  const [prompt, setPrompt] = useState('')
  const [activeTab, setActiveTab] = useState<'suggestions' | 'comments'>('suggestions')
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set())
  const [streamingContents, setStreamingContents] = useState<Map<string, string>>(new Map())
  // suggestionId → final AI body awaiting user approval (diff shown, not yet committed)
  const [pendingApprovals, setPendingApprovals] = useState<Map<string, string>>(new Map())
  // commentId → in-progress "Fix by Agent" state
  const [fixingCommentIds, setFixingCommentIds] = useState<Set<string>>(new Set())
  const [commentStreamingContents, setCommentStreamingContents] = useState<Map<string, string>>(new Map())
  // commentId → { sectionId, originalBody, newBody } awaiting approval
  const [commentPendingFixes, setCommentPendingFixes] = useState<Map<string, { sectionId: string; originalBody: string; newBody: string }>>(new Map())
  // Set when a comment focus arrives from the editor bubble; consumed once Comments tab renders
  const [pendingFocusCommentId, setPendingFocusCommentId] = useState<string | null>(null)
  const commentsListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dataService.getAgents().then((list) => {
      setAgents(list)
      const defaultAgent = list.find((a) => a.id === 'reviewer') ?? list[0]
      if (defaultAgent) {
        setActiveAgentId(defaultAgent.id)
        setPrompt(defaultAgent.prompt)
      }
    }).catch(() => {})
  }, [])

  // Step 1: incoming focus from editor bubble → switch to Comments tab and store id
  useEffect(() => {
    if (!focusCommentId) return
    setActiveTab('comments')
    setPendingFocusCommentId(focusCommentId)
    clearFocusComment()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCommentId])

  // Step 2: once Comments tab is active and we have a pending focus, scroll + trigger
  useEffect(() => {
    if (activeTab !== 'comments' || !pendingFocusCommentId) return
    setPendingFocusCommentId(null)

    // Scroll the comment card into view after paint
    requestAnimationFrame(() => {
      const el = commentsListRef.current?.querySelector(`[data-comment-id="${pendingFocusCommentId}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })

    // Auto-trigger Fix by Agent for this comment
    const comment = activeDocument?.comments.find(
      (c) => c.id === pendingFocusCommentId && c.status === 'open',
    )
    if (comment && !fixingCommentIds.has(comment.id) && !commentPendingFixes.has(comment.id)) {
      void handleFixByAgent(comment)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pendingFocusCommentId])

  if (!panelOpen) return null

  const activeAgent = agents.find((a) => a.id === activeAgentId)
  const isLoading = isGenerating || isReviewing

  const suggestions: Suggestion[] = activeDocument?.suggestions ?? []
  const openComments: Comment[] = activeDocument?.comments.filter((c) => c.status === 'open') ?? []
  const pendingCount = suggestions.filter((s) => s.status === 'pending').length

  function handleAgentSelect(agentId: string) {
    const agent = agents.find((a) => a.id === agentId)
    if (!agent) return
    setActiveAgentId(agentId)
    setPrompt(agent.prompt)
  }

  function handleSubmit() {
    if (!activeDocument || isLoading || !prompt.trim() || !activeAgent) return
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

  async function handleAccept(suggestion: Suggestion) {
    if (!activeDocument || applyingIds.has(suggestion.id) || pendingApprovals.has(suggestion.id)) return
    setApplyingIds((prev) => new Set(prev).add(suggestion.id))
    setStreamingContents((prev) => { const m = new Map(prev); m.set(suggestion.id, ''); return m })
    try {
      const aiBody = await acceptSuggestion(suggestion, (chunk) => {
        setStreamingContents((prev) => {
          const m = new Map(prev)
          m.set(suggestion.id, (m.get(suggestion.id) ?? '') + chunk)
          return m
        })
      })
      // Store the final body for user approval — do NOT commit yet
      if (aiBody) {
        setPendingApprovals((prev) => { const m = new Map(prev); m.set(suggestion.id, aiBody); return m })
      }
    } finally {
      setApplyingIds((prev) => { const s = new Set(prev); s.delete(suggestion.id); return s })
      setStreamingContents((prev) => { const m = new Map(prev); m.delete(suggestion.id); return m })
    }
  }

  function handleApprove(suggestion: Suggestion) {
    const aiBody = pendingApprovals.get(suggestion.id)
    setPendingApprovals((prev) => { const m = new Map(prev); m.delete(suggestion.id); return m })
    applyAcceptedSuggestion(suggestion, aiBody)
  }

  function handleDiscard(suggestion: Suggestion) {
    setPendingApprovals((prev) => { const m = new Map(prev); m.delete(suggestion.id); return m })
  }

  function handleDismiss(suggestion: Suggestion) {
    if (!activeDocument) return
    dispatch({ type: 'REJECT_SUGGESTION', docId: activeDocument.id, suggestionId: suggestion.id })
  }

  async function handleFixByAgent(comment: Comment) {
    if (fixingCommentIds.has(comment.id) || commentPendingFixes.has(comment.id)) return
    setFixingCommentIds((prev) => new Set(prev).add(comment.id))
    setCommentStreamingContents((prev) => { const m = new Map(prev); m.set(comment.id, ''); return m })
    try {
      const result = await fixCommentByAgent(comment, (chunk) => {
        setCommentStreamingContents((prev) => {
          const m = new Map(prev)
          m.set(comment.id, (m.get(comment.id) ?? '') + chunk)
          return m
        })
      })
      if (result) {
        setCommentPendingFixes((prev) => {
          const m = new Map(prev)
          m.set(comment.id, { sectionId: result.sectionId, originalBody: result.originalBody, newBody: result.aiBody })
          return m
        })
      }
    } finally {
      setFixingCommentIds((prev) => { const s = new Set(prev); s.delete(comment.id); return s })
      setCommentStreamingContents((prev) => { const m = new Map(prev); m.delete(comment.id); return m })
    }
  }

  function handleApproveCommentFix(comment: Comment) {
    const fix = commentPendingFixes.get(comment.id)
    if (!fix) return
    setCommentPendingFixes((prev) => { const m = new Map(prev); m.delete(comment.id); return m })
    applyCommentFix(comment, fix.sectionId, fix.newBody)
  }

  function handleAbortCommentFix(comment: Comment) {
    setCommentPendingFixes((prev) => { const m = new Map(prev); m.delete(comment.id); return m })
  }

  const canSubmit = !!activeDocument && !isLoading && !!prompt.trim() && !!activeAgent

  return (
    <aside className="w-90 shrink-0 flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      {/* Panel header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">AI Assistant</h2>

        {/* Agent selector */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Select an agent</p>
          <div className="flex flex-wrap gap-1.5">
            {agents.map((agent) => {
              const isActive = activeAgentId === agent.id
              return (
                <button
                  key={agent.id}
                  onClick={() => handleAgentSelect(agent.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    isActive
                      ? `${agent.bgLight} ${agent.textColor} border-current`
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
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
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1.5">Ask the {activeAgent?.name ?? 'AI Agent'}</p>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              disabled={isLoading}
              placeholder="Type your instructions…"
              className="w-full text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-10 resize-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-600 leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
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
            <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-1.5 flex items-center gap-1">
              <Spinner />
              {isGenerating ? 'Generating draft…' : 'Running review…'}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'suggestions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Suggestions
          {pendingCount > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'comments'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Comments
          {openComments.length > 0 && (
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
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
            {suggestions.map((suggestion) => {
              const section = activeDocument?.sections.find((s) => s.id === suggestion.sectionId)
              const originalBody = section ? extractPlainText(section.body) : ''
              return (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  originalBody={originalBody}
                  onAccept={() => handleAccept(suggestion)}
                  onDismiss={() => handleDismiss(suggestion)}
                  onApprove={() => handleApprove(suggestion)}
                  onDiscard={() => handleDiscard(suggestion)}
                  isApplying={applyingIds.has(suggestion.id)}
                  streamingBody={streamingContents.get(suggestion.id)}
                  pendingBody={pendingApprovals.get(suggestion.id)}
                />
              )
            })}
            {!isReviewing &&
              suggestions.length > 0 &&
              suggestions.every((s) => s.status !== 'pending') &&
              activeDocument?.status === 'approved' && (
                <AllApprovedState />
              )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-2" ref={commentsListRef}>
            {openComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300 dark:text-gray-600 mb-2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-xs text-gray-400 dark:text-gray-600">No open comments</p>
              </div>
            ) : (
              openComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  docId={activeDocument!.id}
                  dispatch={dispatch}
                  isFixing={fixingCommentIds.has(comment.id)}
                  streamingBody={commentStreamingContents.get(comment.id)}
                  pendingFix={commentPendingFixes.get(comment.id)}
                  onFixByAgent={() => handleFixByAgent(comment)}
                  onApproveFix={() => handleApproveCommentFix(comment)}
                  onAbortFix={() => handleAbortCommentFix(comment)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
