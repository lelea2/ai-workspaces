import { useEffect, useRef, useState, useCallback } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot, $getSelection, $isRangeSelection,
  $createParagraphNode, $createTextNode,
  FORMAT_TEXT_COMMAND, type EditorState, type LexicalEditor as LexicalEditorType,
} from 'lexical'
import { $setBlocksType } from '@lexical/selection'
import { $isHeadingNode, $createHeadingNode, HeadingNode } from '@lexical/rich-text'
import { $isListNode, ListNode, ListItemNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from '@lexical/list'
import { LinkNode, TOGGLE_LINK_COMMAND, $isLinkNode } from '@lexical/link'
import { CodeNode, CodeHighlightNode, $isCodeNode, $createCodeNode } from '@lexical/code'
import { isLexicalJson } from '../../utils/lexical'

// ── Lexical theme ─────────────────────────────────────────────────────────────

const theme = {
  heading: {
    h1: 'text-2xl font-bold text-gray-900 leading-tight mb-1',
    h2: 'text-xl font-semibold text-gray-800 leading-tight mb-1',
    h3: 'text-base font-semibold text-gray-700 leading-tight mb-0.5',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    underlineStrikethrough: 'underline line-through',
    code: 'font-mono bg-gray-100 text-rose-600 px-1 py-0.5 rounded text-[0.88em]',
  },
  list: {
    ul: 'list-disc pl-5 space-y-0.5',
    ol: 'list-decimal pl-5 space-y-0.5',
    listitem: 'leading-relaxed',
    nested: { listitem: 'list-none' },
  },
  link: 'text-blue-600 underline cursor-pointer hover:text-blue-800',
  paragraph: 'leading-relaxed mb-0.5 min-h-[1.4em]',
  code: 'font-mono bg-gray-900 text-emerald-300 rounded-lg px-4 py-3 text-[0.82em] my-2 block whitespace-pre-wrap border border-gray-700',
}

// ── Initializer plugin ────────────────────────────────────────────────────────
// Loads initial body (plain text or Lexical JSON) once on mount.

function InitializerPlugin({ body }: { body: string }) {
  const [editor] = useLexicalComposerContext()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    if (!body) return

    if (isLexicalJson(body)) {
      try {
        const state = editor.parseEditorState(body)
        editor.setEditorState(state)
        return
      } catch {}
    }

    // Plain text → paragraph nodes
    editor.update(() => {
      const root = $getRoot()
      root.clear()
      for (const line of body.split('\n')) {
        const para = $createParagraphNode()
        if (line) para.append($createTextNode(line))
        root.append(para)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

// ── Clickable link plugin ─────────────────────────────────────────────────────
// Intercepts clicks on <a> nodes inside the contenteditable and opens them
// in a new tab (browsers suppress normal link navigation in a contenteditable).

function ClickableLinkPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      let target = e.target as HTMLElement | null
      const root = editor.getRootElement()
      while (target && target !== root) {
        if (target.tagName === 'A') {
          const href = (target as HTMLAnchorElement).href
          if (href) {
            e.preventDefault()
            e.stopPropagation()
            window.open(href, '_blank', 'noopener,noreferrer')
          }
          return
        }
        target = target.parentElement
      }
    }

    return editor.registerRootListener((rootElement, prevRootElement) => {
      prevRootElement?.removeEventListener('click', handleClick)
      rootElement?.addEventListener('click', handleClick)
    })
  }, [editor])

  return null
}

// ── Toolbar plugin ────────────────────────────────────────────────────────────

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'code'
type Formats = { bold: boolean; italic: boolean; underline: boolean; code: boolean; link: boolean }

function ToolbarPlugin({ onStateChange }: {
  onStateChange: (blockType: BlockType, formats: Formats) => void
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        const formats: Formats = {
          bold: selection.hasFormat('bold'),
          italic: selection.hasFormat('italic'),
          underline: selection.hasFormat('underline'),
          code: selection.hasFormat('code'),
          link: $isLinkNode(selection.anchor.getNode().getParent()),
        }

        const anchor = selection.anchor.getNode()
        const topLevel = anchor.getTopLevelElement()
        let blockType: BlockType = 'paragraph'
        if (topLevel) {
          if ($isHeadingNode(topLevel)) blockType = topLevel.getTag() as BlockType
          else if ($isListNode(topLevel)) blockType = topLevel.getListType() as BlockType
          else if ($isCodeNode(topLevel)) blockType = 'code'
        }

        onStateChange(blockType, formats)
      })
    })
  }, [editor, onStateChange])

  return null
}

// ── Toolbar UI ────────────────────────────────────────────────────────────────

function ToolbarButton({
  active,
  onMouseDown,
  title,
  children,
}: {
  active?: boolean
  onMouseDown: (e: React.MouseEvent) => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onMouseDown={onMouseDown}
      className={`p-1.5 text-xs font-medium min-w-7 flex items-center justify-center rounded transition-colors
        ${active
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
        }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />
}

// ── Main exported component ───────────────────────────────────────────────────

export default function LexicalEditor({
  sectionId,
  body,
  onChange,
  placeholder = 'Start writing…',
}: {
  sectionId: string
  body: string
  onChange: (json: string) => void
  placeholder?: string
}) {
  const [blockType, setBlockType] = useState<BlockType>('paragraph')
  const [formats, setFormats] = useState<Formats>({
    bold: false, italic: false, underline: false, code: false, link: false,
  })

  const handleStateChange = useCallback((bt: BlockType, fmt: Formats) => {
    setBlockType(bt)
    setFormats(fmt)
  }, [])

  const handleChange = useCallback((editorState: EditorState, editor: LexicalEditorType) => {
    const json = JSON.stringify(editorState.toJSON())
    // Skip saving unchanged empty-document placeholder state
    editorState.read(() => {
      if ($getRoot().isEmpty()) return
    })
    onChange(json)
    void editor
  }, [onChange])

  function applyBlock(editor: LexicalEditorType, type: BlockType) {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return

      if (type === 'bullet') {
        if (blockType === 'bullet') editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
        else editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        return
      }
      if (type === 'number') {
        if (blockType === 'number') editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
        else editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        return
      }
      if (type === 'code') {
        if (blockType === 'code') $setBlocksType(selection, $createParagraphNode)
        else $setBlocksType(selection, () => $createCodeNode())
        return
      }
      if (type === 'paragraph') {
        $setBlocksType(selection, $createParagraphNode)
        return
      }
      $setBlocksType(selection, () => $createHeadingNode(type as 'h1' | 'h2' | 'h3'))
    })
  }

  const initialConfig = {
    namespace: `section-${sectionId}`,
    theme,
    nodes: [HeadingNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode],
    onError: (err: Error) => console.error('[lexical]', err),
    editorState: null, // InitializerPlugin handles this
  }

  return (
    // Key by sectionId so the editor fully remounts when navigating between docs
    <LexicalComposer key={sectionId} initialConfig={initialConfig}>
      {/* Toolbar — rendered outside the editor, communicates via composer context */}
      <InnerToolbar
        blockType={blockType}
        formats={formats}
        onStateChange={handleStateChange}
        applyBlock={applyBlock}
      />

      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="w-full text-sm text-gray-700 leading-relaxed outline-none min-h-[4rem] px-2 py-1.5 rounded-md border border-transparent focus:border-blue-300 focus:bg-blue-50/30 hover:border-gray-200 transition-colors"
              aria-placeholder={placeholder}
              placeholder={
                <div className="absolute top-1.5 left-2 text-sm text-gray-300 pointer-events-none select-none">
                  {placeholder}
                </div>
              }
            />
          }
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <ClickableLinkPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        <InitializerPlugin body={body} />
        <ToolbarPlugin onStateChange={handleStateChange} />
      </div>
    </LexicalComposer>
  )
}

// Inner toolbar component — lives inside LexicalComposer context
function InnerToolbar({
  blockType,
  formats,
  onStateChange,
  applyBlock,
}: {
  blockType: BlockType
  formats: Formats
  onStateChange: (bt: BlockType, fmt: Formats) => void
  applyBlock: (editor: LexicalEditorType, type: BlockType) => void
}) {
  const [editor] = useLexicalComposerContext()

  function prevent(e: React.MouseEvent) { e.preventDefault() }

  function fmt(e: React.MouseEvent, format: 'bold' | 'italic' | 'underline' | 'code') {
    e.preventDefault()
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
  }

  function block(e: React.MouseEvent, type: BlockType) {
    e.preventDefault()
    applyBlock(editor, type)
  }

  function link(e: React.MouseEvent) {
    e.preventDefault()
    if (formats.link) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    } else {
      const url = window.prompt('URL:')
      if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url, target: '_blank', rel: 'noopener' })
    }
  }

  void onStateChange // consumed via ToolbarPlugin registration, not directly

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100">
      <ToolbarButton active={blockType === 'h1'} onMouseDown={(e) => { prevent(e); block(e, blockType === 'h1' ? 'paragraph' : 'h1') }} title="Heading 1">
        <span className="font-bold text-[11px]">H1</span>
      </ToolbarButton>
      <ToolbarButton active={blockType === 'h2'} onMouseDown={(e) => { prevent(e); block(e, blockType === 'h2' ? 'paragraph' : 'h2') }} title="Heading 2">
        <span className="font-bold text-[11px]">H2</span>
      </ToolbarButton>
      <ToolbarButton active={blockType === 'h3'} onMouseDown={(e) => { prevent(e); block(e, blockType === 'h3' ? 'paragraph' : 'h3') }} title="Heading 3">
        <span className="font-bold text-[11px]">H3</span>
      </ToolbarButton>
      <Divider />
      <ToolbarButton active={formats.bold} onMouseDown={(e) => fmt(e, 'bold')} title="Bold">
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton active={formats.italic} onMouseDown={(e) => fmt(e, 'italic')} title="Italic">
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton active={formats.underline} onMouseDown={(e) => fmt(e, 'underline')} title="Underline">
        <span className="underline">U</span>
      </ToolbarButton>
      <Divider />
      <ToolbarButton active={blockType === 'bullet'} onMouseDown={(e) => block(e, 'bullet')} title="Bullet list">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="2.5" cy="4" r="1" fill="currentColor" />
          <circle cx="2.5" cy="7" r="1" fill="currentColor" />
          <circle cx="2.5" cy="10" r="1" fill="currentColor" />
          <path d="M5 4h7M5 7h7M5 10h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </ToolbarButton>
      <ToolbarButton active={blockType === 'number'} onMouseDown={(e) => block(e, 'number')} title="Numbered list">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1.5 3h1.5M2.5 3v3M1.5 6h2M1.5 8.5c0-.8.5-1 1-1 .6 0 1 .3 1 .7 0 .4-.3.7-.8 1.1L1.5 10.5H4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 4h6M6 7h6M6 10h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </ToolbarButton>
      <Divider />
      <ToolbarButton active={formats.link} onMouseDown={link} title="Link">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5.5 8.5a3.5 3.5 0 0 0 5 0l1.5-1.5a3.5 3.5 0 0 0-5-5L6 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M8.5 5.5a3.5 3.5 0 0 0-5 0L2 7a3.5 3.5 0 0 0 5 5L8 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </ToolbarButton>
      <ToolbarButton active={blockType === 'code'} onMouseDown={(e) => block(e, 'code')} title="Code block">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M4.5 4.5L2 7l2.5 2.5M9.5 4.5L12 7l-2.5 2.5M7.5 3l-1 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </ToolbarButton>
    </div>
  )
}
