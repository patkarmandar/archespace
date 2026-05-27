import { useState, useRef, useCallback } from 'react'
import { Trash2, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react'
import { TextboxEditor, ChecklistEditor, MenuListEditor, CardListEditor } from './ItemEditors'

const TYPE_LABELS = {
  textbox: 'Note',
  checkbox_list: 'Checklist',
  menu_list: 'List',
  card_list: 'Cards',
}

const TYPE_STYLES = {
  textbox: { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  checkbox_list: { text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  menu_list: { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  card_list: { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
}

export default function CollectionItem({ item, onUpdate, onDelete }) {
  const [collapsed, setCollapsed] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(item.title)
  const saveTimer = useRef(null)
  const style = TYPE_STYLES[item.type]

  const handleContentChange = useCallback((newContent) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onUpdate({ id: item.id, title: item.title, content: newContent })
    }, 500)
  }, [item.id, item.title, onUpdate])

  const saveTitle = () => {
    setEditingTitle(false)
    if (titleVal !== item.title) {
      onUpdate({ id: item.id, title: titleVal, content: item.content })
    }
  }

  const editors = {
    textbox: <TextboxEditor content={item.content} onChange={handleContentChange} />,
    checkbox_list: <ChecklistEditor content={item.content} onChange={handleContentChange} />,
    menu_list: <MenuListEditor content={item.content} onChange={handleContentChange} />,
    card_list: <CardListEditor content={item.content} onChange={handleContentChange} />,
  }

  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
      {/* Item header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border">
        {/* Type badge */}
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg ${style.bg} ${style.text} border ${style.border}`}>
          {TYPE_LABELS[item.type]}
        </span>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitleVal(item.title); setEditingTitle(false) } }}
              onBlur={saveTitle}
              className="w-full bg-bg-elevated border border-accent rounded-lg px-2.5 py-1 text-sm font-medium text-text-primary focus:outline-none"
            />
          ) : (
            <span className={`text-sm font-medium truncate block ${item.title ? 'text-text-primary' : 'text-text-muted italic'}`}>
              {item.title || 'Untitled'}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {editingTitle ? (
            <>
              <button
                onClick={saveTitle}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-success/15 border border-success/30 text-success hover:bg-success/25 transition-all"
              >
                <Check size={12} /> Save
              </button>
              <button
                onClick={() => { setTitleVal(item.title); setEditingTitle(false) }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-bg-border bg-bg-elevated hover:bg-bg-hover text-text-secondary transition-all"
              >
                <X size={12} /> Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditingTitle(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-bg-border hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-all"
              >
                <Pencil size={11} /> Rename
              </button>
              <button
                onClick={() => setCollapsed(v => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-bg-border hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-all"
              >
                {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                <span className="hidden sm:inline">{collapsed ? 'Expand' : 'Collapse'}</span>
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-bg-border bg-bg-surface text-text-secondary hover:text-danger hover:bg-danger/10 hover:border-danger/30 focus:text-danger focus:bg-danger/10 focus:border-danger/30 active:bg-danger/15 transition-all"
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="px-4 py-4">
          {editors[item.type]}
        </div>
      )}
    </div>
  )
}
