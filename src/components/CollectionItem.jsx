import { useState, useRef, useCallback } from 'react'
import { Trash2, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react'
import { IconButton } from './UI'
import { TextboxEditor, ChecklistEditor, MenuListEditor, CardListEditor } from './ItemEditors'

const TYPE_LABELS = {
  textbox: 'Note',
  checkbox_list: 'Checklist',
  menu_list: 'List',
  card_list: 'Cards',
}

const TYPE_COLORS = {
  textbox: 'text-blue-400 bg-blue-400/10',
  checkbox_list: 'text-green-400 bg-green-400/10',
  menu_list: 'text-purple-400 bg-purple-400/10',
  card_list: 'text-amber-400 bg-amber-400/10',
}

export default function CollectionItem({ item, onUpdate, onDelete }) {
  const [collapsed, setCollapsed] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(item.title)
  const saveTimer = useRef(null)

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
    <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden group/item">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-bg-border">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-md shrink-0 ${TYPE_COLORS[item.type]}`}>
          {TYPE_LABELS[item.type]}
        </span>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitleVal(item.title); setEditingTitle(false) } }}
                className="flex-1 bg-bg-elevated border border-accent rounded-lg px-2 py-0.5 text-sm text-text-primary focus:outline-none"
              />
              <button onClick={saveTitle} className="text-success hover:opacity-80"><Check size={14} /></button>
              <button onClick={() => { setTitleVal(item.title); setEditingTitle(false) }} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group/title">
              <span className={`text-sm font-medium truncate ${item.title ? 'text-text-primary' : 'text-text-muted italic'}`}>
                {item.title || 'Untitled'}
              </span>
              <button
                onClick={() => setEditingTitle(true)}
                className="opacity-0 group-hover/title:opacity-100 text-text-muted hover:text-text-primary transition-opacity"
              >
                <Pencil size={11} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <IconButton onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </IconButton>
          <IconButton danger onClick={() => onDelete(item.id)} title="Delete item">
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 py-4">
          {editors[item.type]}
        </div>
      )}
    </div>
  )
}
