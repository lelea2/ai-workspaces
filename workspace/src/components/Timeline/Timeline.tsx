import { useState } from 'react'
import { useDocument } from '../../hooks/useDocument'
import { formatRelativeTime } from '../../utils/time'
import type { ActivityEvent } from '../../types'

const TYPE_ICON: Record<ActivityEvent['type'], React.ReactNode> = {
  created: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  drafted: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 7.5l1.5-1.5 4-4 1.5 1.5-4 4L3.5 9 2 7.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  reviewed: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.5 5l1 1L6.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  edited: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M6 2.5l1.5 1.5-4 4H2v-1.5l4-4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  accepted: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  rejected: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M3 3l4 4M7 3L3 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  resolved: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 5l1.5 1.5L7 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  commented: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M9 1H1v6.5h3L5 9l1-1.5h3V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  replied: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 3.5L4.5 1v2C7.5 3 9 4.5 9 7c-.8-1.5-2-2-4.5-2v2L2 4.5l-.5-.5L2 3.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  published: (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M5 1v5M3 3.5L5 1l2 2.5M2 7.5h6a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V8a.5.5 0 0 1 .5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

function EventNode({ event }: { event: ActivityEvent }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
        style={{ backgroundColor: event.actorColor }}
      >
        {event.actorInitial}
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1 leading-tight">
          <span className="text-xs font-medium text-gray-700">{event.actor}</span>
          <span className="text-gray-300">{TYPE_ICON[event.type]}</span>
        </div>
        <span className="text-[10px] text-gray-500 leading-tight">
          {event.action} · {formatRelativeTime(event.createdAt)}
        </span>
      </div>
    </div>
  )
}

const CHEVRON = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-300 shrink-0">
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default function Timeline() {
  const { activeDocument } = useDocument()
  const [showAll, setShowAll] = useState(false)

  const events = activeDocument?.events ?? []
  const deduped = Array.from(new Map(events.map((e) => [e.id, e])).values())
  const visible = showAll ? deduped : deduped.slice(0, 6)

  return (
    <div className="h-16 bg-white border-t border-gray-200 flex items-center px-4 gap-4 shrink-0">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap shrink-0">
        Activity
      </span>

      {events.length === 0 ? (
        <span className="text-xs text-gray-400">No activity yet</span>
      ) : (
        <div className="flex-1 flex items-center gap-3 overflow-x-auto min-w-0">
          {visible.map((event, index) => (
            <div key={event.id} className="flex items-center gap-3">
              <EventNode event={event} />
              {index < visible.length - 1 && CHEVRON}
            </div>
          ))}
        </div>
      )}

      {events.length > 6 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="ml-auto text-xs text-blue-600 hover:underline whitespace-nowrap shrink-0"
        >
          {showAll ? 'Show less' : `View all ${events.length}`}
        </button>
      )}
    </div>
  )
}
