import { useState, useRef, useEffect, useCallback } from 'react'
import { Trash2, ChevronDown, ChevronUp, Pencil, Check, X, Pin, PinOff, Save, AlertTriangle } from 'lucide-react'
import { TextboxEditor, ChecklistEditor, MenuListEditor, CardListEditor } from './ItemEditors'

const TYPE_LABELS = { textbox: 'Note', checkbox_list: 'Checklist', menu_list: 'List', card_list: 'Cards' }
const TYPE_STYLES = {
  textbox:       { text: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20'   },
  checkbox_list: { text: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20'  },
  menu_list:     { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  card_list:     { text: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20'  },
}

export default function CollectionItem({ item, onUpdate, onTogglePin, onDelete, onDirtyChange }) {
  const [collapsed, setCollapsed]       = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal]         = useState(item.title)
  const [localContent, setLocalContent] = useState(item.content)
  const [isDirty, setIsDirty]           = useState(false)
  const [saving, setSaving]             = useState(false)
  const [collapseGuard, setCollapseGuard] = useState(false) // show warning before collapsing dirty
  const style = TYPE_STYLES[item.type]

  // Keep local title in sync if item prop changes from outside (e.g. realtime)
  useEffect(() => {
    if (!isDirty) {
      setTitleVal(item.title)
      setLocalContent(item.content)
    }
  }, [item.title, item.content, isDirty])

  // Notify parent about dirty state for page-leave warning
  useEffect(() => {
    onDirtyChange?.(item.id, isDirty)
  }, [isDirty, item.id, onDirtyChange])

  const handleContentChange = useCallback((newContent) => {
    setLocalContent(newContent)
    setIsDirty(true)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await onUpdate({ id: item.id, title: titleVal, content: localContent })
    setIsDirty(false)
    setSaving(false)
    setCollapseGuard(false)
  }

  const handleDiscard = () => {
    setTitleVal(item.title)
    setLocalContent(item.content)
    setIsDirty(false)
    setCollapseGuard(false)
  }

  const handleCollapseClick = () => {
    if (!collapsed && isDirty) {
      setCollapseGuard(true) // show warning instead of collapsing
      return
    }
    setCollapseGuard(false)
    setCollapsed(v => !v)
  }

  const saveTitle = () => {
    setEditingTitle(false)
    if (titleVal !== item.title) setIsDirty(true)
  }

  const editors = {
    textbox:       <TextboxEditor       content={localContent} onChange={handleContentChange} />,
    checkbox_list: <ChecklistEditor     content={localContent} onChange={handleContentChange} />,
    menu_list:     <MenuListEditor      content={localContent} onChange={handleContentChange} />,
    card_list:     <CardListEditor      content={localContent} onChange={handleContentChange} />,
  }

  return (
    <div className={`bg-bg-surface border rounded-2xl overflow-hidden transition-colors ${
      item.pinned ? 'border-accent/30' : 'border-bg-border'
    }`}>
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border flex-wrap gap-y-2">
        {/* Pin indicator */}
        {item.pinned && <Pin size={11} className="text-accent shrink-0 fill-accent" />}

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

        {/* Dirty indicator */}
        {isDirty && !saving && (
          <span className="shrink-0 text-xs text-amber-400 font-medium px-2 py-0.5 bg-amber-400/10 rounded-md border border-amber-400/20">
            Unsaved
          </span>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {isDirty ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-60"
              >
                {saving ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" /> : <Save size={12} />}
                Save
              </button>
              <button
                onClick={handleDiscard}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary transition-all"
              >
                <X size={12} /> Discard
              </button>
            </>
          ) : (
            <>
              {editingTitle ? (
                <>
                  <button onClick={saveTitle} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-success/15 border border-success/30 text-success hover:bg-success/25 transition-all">
                    <Check size={12} /> Save
                  </button>
                  <button onClick={() => { setTitleVal(item.title); setEditingTitle(false) }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary transition-all">
                    <X size={12} /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all"
                  >
                    <Pencil size={11} /> Rename
                  </button>
                  <button
                    onClick={() => onTogglePin(item.id, item.pinned)}
                    title={item.pinned ? 'Unpin' : 'Pin to top'}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      item.pinned
                        ? 'border-accent/30 bg-accent-muted text-accent hover:bg-accent/20'
                        : 'border-bg-border bg-bg-surface text-text-secondary hover:text-accent hover:bg-accent-muted hover:border-accent/30'
                    }`}
                  >
                    {item.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                    {item.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={handleCollapseClick}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all"
                  >
                    {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    <span className="hidden sm:inline">{collapsed ? 'Expand' : 'Collapse'}</span>
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-bg-border bg-bg-surface hover:bg-danger/10 hover:border-danger/30 hover:text-danger text-text-secondary transition-all"
                  >
                    <Trash2 size={12} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Unsaved collapse warning ── */}
      {collapseGuard && (
        <div className="px-4 py-3 bg-amber-400/8 border-b border-amber-400/20 flex items-center gap-3 flex-wrap">
          <AlertTriangle size={15} className="text-amber-400 shrink-0" />
          <span className="text-sm text-amber-400 flex-1">You have unsaved changes.</span>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover text-white transition-colors"
            >
              <Save size={12} /> Save & collapse
            </button>
            <button
              onClick={() => { handleDiscard(); setCollapsed(true) }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary transition-all"
            >
              Discard & collapse
            </button>
            <button
              onClick={() => setCollapseGuard(false)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {!collapsed && (
        <div className="px-4 py-4">
          {editors[item.type]}
        </div>
      )}
    </div>
  )
}
