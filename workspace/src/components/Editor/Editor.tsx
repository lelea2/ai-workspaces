import { useState, useEffect, useRef, useCallback } from 'react'
import { useDocument } from '../../hooks/useDocument'
import { formatRelativeTime } from '../../utils/time'
import { extractPlainText } from '../../utils/lexical'
import LexicalEditor from './LexicalEditor'
import type { Comment, Section } from '../../types'
import type { Action } from '../../store/actions'

// ---------- Generating skeleton ----------

function GeneratingSkeleton() {
  const sections = [
    { w: 'w-56', lines: [1, 0.9, 0.7, 0.8] },
    { w: 'w-64', lines: [1, 0.85, 0.6, 0.75, 0.5] },
    { w: 'w-52', lines: [1, 0.9, 0.8, 0.65] },
    { w: 'w-48', lines: [1, 0.7] },
    { w: 'w-60', lines: [1, 0.85, 0.7] },
  ]
  return (
    <div className="animate-pulse space-y-8">
      {sections.map((s, i) => (
        <div key={i} className="space-y-2.5">
          <div className={`h-5 bg-gray-200 rounded ${s.w}`} />
          {s.lines.map((pct, j) => (
            <div
              key={j}
              className="h-3 bg-gray-100 rounded"
              style={{ width: `${pct * 100}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ---------- Comment Bubble ----------

function CommentBubble({
  comment,
  expanded,
  onToggle,
  onResolve,
  onReply,
}: {
  comment: Comment
  expanded: boolean
  onToggle: () => void
  onResolve: () => void
  onReply: (text: string) => void
}) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const replyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (replying) replyRef.current?.focus()
  }, [replying])

  function handlePostReply() {
    const trimmed = replyText.trim()
    if (!trimmed) return
    onReply(trimmed)
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

  const replies = comment.replies ?? []

  return (
    <div className="w-44 shrink-0 ml-3 mt-1">
      {/* Main comment card */}
      <button
        onClick={onToggle}
        className="w-full text-left bg-white border border-gray-200 rounded-lg shadow-sm p-2.5 text-xs hover:border-indigo-300 hover:shadow-md transition-all"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: comment.agentColor ?? '#6366f1' }}
          >
            {comment.agentInitial ?? 'A'}
          </div>
          <span className="font-semibold text-gray-700 truncate">{comment.agentName ?? 'AI'}</span>
          <span className="text-gray-400 ml-auto shrink-0 text-[10px]">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>
        <p className={`text-gray-600 leading-snug ${expanded ? '' : 'line-clamp-2'}`}>
          {comment.text}
        </p>
        {!expanded && replies.length > 0 && (
          <p className="text-[10px] text-indigo-500 mt-1 font-medium">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </p>
        )}
      </button>

      {/* Replies */}
      {expanded && replies.length > 0 && (
        <div className="mt-1 ml-1 border-l-2 border-indigo-100 pl-2 space-y-1.5">
          {replies.map((reply) => (
            <div key={reply.id} className="text-xs">
              <div className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                  style={{ backgroundColor: reply.agentColor }}
                >
                  {reply.agentInitial}
                </div>
                <span className="font-semibold text-gray-700 truncate">{reply.agentName}</span>
                <span className="text-gray-400 ml-auto text-[10px]">
                  {formatRelativeTime(reply.createdAt)}
                </span>
              </div>
              <p className="text-gray-600 leading-snug mt-0.5 pl-5">{reply.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply compose box */}
      {expanded && replying && (
        <div className="mt-1.5 ml-1">
          <div className="flex items-center gap-1 mb-1">
            <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
              K
            </div>
            <span className="text-[10px] text-gray-500">Replying as Khanh</span>
          </div>
          <textarea
            ref={replyRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleReplyKeyDown}
            placeholder="Write a reply… (⌘↵ to send)"
            rows={2}
            className="w-full text-xs border border-indigo-300 rounded-md px-2 py-1.5 resize-none outline-none focus:ring-1 focus:ring-indigo-400 placeholder-gray-300 leading-relaxed"
          />
          <div className="flex gap-1.5 mt-1">
            <button
              onClick={handlePostReply}
              disabled={!replyText.trim()}
              className="flex-1 py-1 text-[11px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

      {/* Action buttons */}
      {expanded && !replying && (
        <div className="mt-1 flex gap-1.5 px-1">
          <button
            onClick={() => setReplying(true)}
            className="text-[11px] text-blue-600 hover:underline font-medium"
          >
            Reply
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onResolve()
            }}
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
  )
}

// ---------- Section Row ----------

function SectionRow({
  section,
  docId,
  comments,
  dispatch,
}: {
  section: Section
  docId: string
  comments: Comment[]
  dispatch: React.Dispatch<Action>
}) {
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [commentText, setCommentText] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const composeRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (composing) composeRef.current?.focus()
  }, [composing])

  // Debounced save — fires 600ms after the user stops typing
  const handleBodyChange = useCallback((json: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      dispatch({ type: 'EDIT_SECTION', docId, sectionId: section.id, body: json })
    }, 600)
  }, [dispatch, docId, section.id])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  function handleResolve(commentId: string) {
    dispatch({ type: 'RESOLVE_COMMENT', docId, commentId })
    setExpandedCommentId(null)
  }

  function handleReply(commentId: string, text: string) {
    dispatch({ type: 'REPLY_TO_COMMENT', docId, commentId, text })
  }

  function handlePostComment() {
    const trimmed = commentText.trim()
    if (!trimmed) return
    dispatch({ type: 'ADD_COMMENT', docId, sectionId: section.id, text: trimmed })
    setCommentText('')
    setComposing(false)
  }

  function handleCommentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handlePostComment()
    }
    if (e.key === 'Escape') {
      setComposing(false)
      setCommentText('')
    }
  }

  return (
    <div className="flex items-start group">
      {/* Section content */}
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-gray-900 mb-2">{section.heading}</h2>
        <LexicalEditor
          sectionId={section.id}
          body={section.body}
          onChange={handleBodyChange}
        />
      </div>

      {/* Comment bubbles column */}
      <div className="w-48 shrink-0">
        {/* Add comment button — visible on section hover */}
        {!composing && (
          <div className="ml-3 mt-1 flex justify-end">
            <button
              onClick={() => setComposing(true)}
              title="Add comment"
              className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full border border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 flex items-center justify-center text-sm font-medium leading-none"
            >
              +
            </button>
          </div>
        )}

        {/* Inline comment compose */}
        {composing && (
          <div className="ml-3 mt-1 w-44">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                K
              </div>
              <span className="text-xs font-semibold text-gray-700">Khanh</span>
            </div>
            <textarea
              ref={composeRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleCommentKeyDown}
              placeholder="Add a comment… (⌘↵ to post)"
              rows={3}
              className="w-full text-xs border border-indigo-300 rounded-lg px-2.5 py-2 resize-none outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-300 leading-relaxed shadow-sm"
            />
            <div className="flex gap-1.5 mt-1.5">
              <button
                onClick={handlePostComment}
                disabled={!commentText.trim()}
                className="flex-1 py-1 text-[11px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Post
              </button>
              <button
                onClick={() => { setComposing(false); setCommentText('') }}
                className="flex-1 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Existing comment bubbles */}
        {comments.map((comment) => (
          <CommentBubble
            key={comment.id}
            comment={comment}
            expanded={expandedCommentId === comment.id}
            onToggle={() =>
              setExpandedCommentId(expandedCommentId === comment.id ? null : comment.id)
            }
            onResolve={() => handleResolve(comment.id)}
            onReply={(text) => handleReply(comment.id, text)}
          />
        ))}
      </div>
    </div>
  )
}

// ---------- Empty / no-sections states ----------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-gray-200 mb-3">
        <rect x="6" y="4" width="28" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 14h16M12 20h12M12 26h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium text-gray-500 mb-1">No document selected</p>
      <p className="text-xs text-gray-400">Select a document from the sidebar or create a new one</p>
    </div>
  )
}

function NoSectionsState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-gray-200 mb-3">
        <path d="M16 8v16M8 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-gray-400">Use the AI panel to generate a draft</p>
    </div>
  )
}

// ---------- Editor ----------

export default function Editor() {
  const { activeDocument, isGenerating, dispatch } = useDocument()

  if (!activeDocument) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden bg-white border-r border-gray-200">
        <EmptyState />
      </main>
    )
  }

  const wordCount = activeDocument.sections
    .map((s) => extractPlainText(s.body).trim())
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-white border-r border-gray-200">
      {/* Generating progress bar */}
      {isGenerating && (
        <div className="h-0.5 bg-blue-50 shrink-0 overflow-hidden">
          <div className="h-full bg-blue-400 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      {/* Document content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-6">
          <h1 className={`text-2xl font-bold text-gray-900 mb-6 ${isGenerating ? 'opacity-30' : ''}`}>
            {activeDocument.title}
          </h1>

          {isGenerating ? (
            <GeneratingSkeleton />
          ) : activeDocument.sections.length === 0 ? (
            <NoSectionsState />
          ) : (
            <div className="space-y-6">
              {activeDocument.sections.map((section) => {
                const sectionComments = activeDocument.comments.filter(
                  (c) => c.sectionId === section.id && c.status === 'open',
                )
                return (
                  <SectionRow
                    key={section.id}
                    section={section}
                    docId={activeDocument.id}
                    comments={sectionComments}
                    dispatch={dispatch}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-gray-100 bg-gray-50/50 shrink-0">
        <span className="text-xs text-gray-400">{wordCount} words</span>
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Everyone can edit
        </span>
      </div>
    </main>
  )
}
