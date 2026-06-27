import { useState, useEffect } from 'react'
import { useDocument } from '../../hooks/useDocument'
import { useUI } from '../../store/UIContext'
import { formatRelativeTime } from '../../utils/time'
import { dataService } from '../../services/data/dataService'
import type { DocumentStatus } from '../../types'

const STATUS_COLORS: Record<DocumentStatus, string> = {
  reviewing: 'bg-blue-100 text-blue-700',
  draft: 'bg-gray-100 text-gray-600',
  approved: 'bg-green-100 text-green-700',
}

function DocIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      className={`shrink-0 mt-0.5 ${active ? 'text-blue-500' : 'text-gray-400'}`}
    >
      <path d="M3 2h5.5L11 4.5V12H3V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8.5 2v3H11" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5 7h4M5 9.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export default function Sidebar() {
  const { documents, activeDocumentId, dispatch } = useDocument()
  const { sidebarOpen } = useUI()
  const [search, setSearch] = useState('')
  const [templatesOpen, setTemplatesOpen] = useState(true)
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    dataService.getTemplates().then(setTemplates).catch(() => {})
  }, [])

  if (!sidebarOpen) return null

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()),
  )

  function handleNewDocument() {
    dispatch({ type: 'CREATE_DOCUMENT', title: 'Untitled Document', sections: [] })
  }

  async function handleTemplateClick(templateId: string, templateName: string) {
    const sections = await dataService.buildTemplateSections(templateId)
    dispatch({ type: 'CREATE_DOCUMENT', title: `New ${templateName}`, sections })
  }

  return (
    <aside className="w-65 shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-hidden">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search docs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Documents list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pb-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documents</span>
            <button
              onClick={handleNewDocument}
              title="New document"
              className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {filtered.length === 0 && (
            <p className="text-xs text-gray-400 px-2 py-3">No documents found</p>
          )}

          <ul className="space-y-0.5">
            {filtered.map((doc) => {
              const isActive = doc.id === activeDocumentId
              return (
                <li key={doc.id}>
                  <button
                    onClick={() => dispatch({ type: 'SET_ACTIVE_DOCUMENT', id: doc.id })}
                    className={`w-full text-left px-2 py-2 rounded-md transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-900' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <DocIcon active={isActive} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-tight line-clamp-2">{doc.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.status]}`}>
                            {doc.status}
                          </span>
                          <span className="text-[10px] text-gray-400">{formatRelativeTime(doc.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Templates */}
        <div className="px-3 mt-2 pb-3">
          <button
            onClick={() => setTemplatesOpen(!templatesOpen)}
            className="flex items-center justify-between w-full mb-1"
          >
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Templates</span>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={`text-gray-400 transition-transform ${templatesOpen ? 'rotate-180' : ''}`}
            >
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {templatesOpen && (
            <ul className="space-y-0.5">
              {templates.map((tpl) => (
                <li key={tpl.id}>
                  <button
                    onClick={() => handleTemplateClick(tpl.id, tpl.name)}
                    className="w-full text-left px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors flex items-center gap-2"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-400 shrink-0">
                      <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M3.5 4h5M3.5 6h3.5M3.5 8h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    {tpl.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* User footer */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-semibold text-white">
            K
          </div>
          <span className="text-xs font-medium text-gray-700">Khanh</span>
        </div>
        <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
