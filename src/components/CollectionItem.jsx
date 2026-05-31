/**
 * CollectionItem.jsx — A single item card inside a collection.
 *
 * Renders a collapsible card with:
 *   - Type badge (Note / Checklist / List / Cards)
 *   - Inline-editable title
 *   - Pin / collapse / delete actions
 *   - The appropriate editor component for the item type
 *   - Unsaved-changes indicator + Save / Discard buttons
 *   - Auto-save: debounced save after 2 seconds of inactivity
 *   - Collapse guard: warns before collapsing with unsaved edits
 *   - Drag handle for reordering
 *
 * The component manages its own local copy of `title` and `content`
 * so edits feel instant. Changes are marked "dirty" and flushed
 * to the server either manually (Save button) or automatically
 * (auto-save after 2s).
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Trash2, ChevronDown, ChevronUp, Pencil, Check, X,
  Pin, PinOff, Save, AlertTriangle, GripVertical,
} from 'lucide-react'
import { TextboxEditor, ChecklistEditor, MenuListEditor, CardListEditor } from './ItemEditors'

/** Human-readable labels for each item type */
const TYPE_LABELS = {
  textbox:       'Note',
  checkbox_list: 'Checklist',
  menu_list:     'List',
  card_list:     'Cards',
}

/** Colour scheme per item type (text, background, border) */
const TYPE_STYLES = {
  textbox:       { text: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20'   },
  checkbox_list: { text: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20'  },
  menu_list:     { text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  card_list:     { text: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20'  },
}

/** Auto-save delay in milliseconds */
const AUTO_SAVE_DELAY = 2000

/**
 * @param {{ item: Object, onUpdate: Function, onTogglePin: Function, onDelete: Function, onDirtyChange?: Function, dragHandleProps?: Object }} props
 */
export default function CollectionItem({
  item,
  onUpdate,
  onTogglePin,
  onDelete,
  onDirtyChange,
  dragHandleProps,
}) {
  // ── Local state ──
  const [collapsed, setCollapsed]         = useState(false)
  const [editingTitle, setEditingTitle]   = useState(false)
  const [titleVal, setTitleVal]           = useState(item.title)
  const [localContent, setLocalContent]   = useState(item.content)
  const [isDirty, setIsDirty]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [collapseGuard, setCollapseGuard] = useState(false)

  const autoSaveTimer = useRef(null)
  const style = TYPE_STYLES[item.type]

  // ── Sync from server when not dirty (realtime / parent update) ──
  useEffect(() => {
    if (!isDirty) {
      setTitleVal(item.title)
      setLocalContent(item.content)
    }
  }, [item.title, item.content, isDirty])

  // ── Notify parent about dirty state (for beforeunload warning) ──
  useEffect(() => {
    onDirtyChange?.(item.id, isDirty)
  }, [isDirty, item.id, onDirtyChange])

  // ── Cleanup auto-save timer on unmount ──
  useEffect(() => {
    return () => clearTimeout(autoSaveTimer.current)
  }, [])

  /**
   * Called by editors on every content change.
   * Marks the item as dirty and schedules an auto-save.
   */
  const handleContentChange = useCallback((newContent) => {
    setLocalContent(newContent)
    setIsDirty(true)

    // Reset the auto-save debounce timer
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      // Auto-save: call handleSave via a ref-stable closure
      performSave(undefined, newContent)
    }, AUTO_SAVE_DELAY)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  /**
   * Persist the current local state to the server.
   * Accepts optional overrides for title/content (used by auto-save
   * to avoid stale closures).
   */
  const performSave = async (overrideTitle, overrideContent) => {
    setSaving(true)
    await onUpdate({
      id: item.id,
      title: overrideTitle ?? titleVal,
      content: overrideContent ?? localContent,
    })
    setIsDirty(false)
    setSaving(false)
    setCollapseGuard(false)
    clearTimeout(autoSaveTimer.current)
  }

  /** Manual save button handler */
  const handleSave = () => performSave()

  /** Discard all local edits and revert to server state */
  const handleDiscard = () => {
    setTitleVal(item.title)
    setLocalContent(item.content)
    setIsDirty(false)
    setCollapseGuard(false)
    clearTimeout(autoSaveTimer.current)
  }

  /**
   * Collapse toggle with guard:
   * If the user tries to collapse while dirty, show a warning
   * instead of losing their edits.
   */
  const handleCollapseClick = () => {
    if (!collapsed && isDirty) {
      setCollapseGuard(true)
      return
    }
    setCollapseGuard(false)
    setCollapsed(v => !v)
  }

  /** Save the title and mark dirty if it changed */
  const saveTitle = () => {
    setEditingTitle(false)
    if (titleVal !== item.title) setIsDirty(true)
  }

  return (
    <div className={`bg-bg-surface border rounded-2xl overflow-hidden transition-colors ${
      item.pinned ? 'border-accent/30' : 'border-bg-border'
    }`}>
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border flex-wrap gap-y-2">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing shrink-0 text-text-muted hover:text-text-secondary transition-colors"
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </div>

        {/* Pin indicator */}
        {item.pinned && <Pin size={11} className="text-accent shrink-0 fill-accent" />}

        {/* Type badge */}
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg ${style.bg} ${style.text} border ${style.border}`}>
          {TYPE_LABELS[item.type]}
        </span>

        {/* Title (inline editable) */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') { setTitleVal(item.title); setEditingTitle(false) }
              }}
              onBlur={saveTitle}
              className="w-full bg-bg-elevated border border-accent rounded-lg px-2.5 py-1 text-sm font-medium text-text-primary focus:outline-none"
            />
          ) : (
            <span className={`text-sm font-medium truncate block ${item.title ? 'text-text-primary' : 'text-text-muted italic'}`}>
              {item.title || 'Untitled'}
            </span>
          )}
        </div>

        {/* Dirty indicator badge */}
        {isDirty && !saving && (
          <span className="shrink-0 text-xs text-amber-400 font-medium px-2 py-0.5 bg-amber-400/10 rounded-md border border-amber-400/20">
            Unsaved
          </span>
        )}

        {/* Saving indicator */}
        {saving && (
          <span className="shrink-0 text-xs text-accent font-medium px-2 py-0.5 bg-accent-muted rounded-md">
            Saving…
          </span>
        )}

        {/* ── Action buttons ── */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {isDirty ? (
            /* Save / Discard mode */
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-60"
              >
                {saving
                  ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                  : <Save size={12} />}
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
            /* Normal action buttons */
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

      {/* ── Unsaved collapse warning ─────────────────── */}
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

      {/* ── Content editor (conditionally rendered) ── */}
      {!collapsed && (
        <div className="px-4 py-4">
          {/* Render only the editor for this item's type (not all four) */}
          {item.type === 'textbox'       && <TextboxEditor    content={localContent} onChange={handleContentChange} />}
          {item.type === 'checkbox_list' && <ChecklistEditor  content={localContent} onChange={handleContentChange} />}
          {item.type === 'menu_list'     && <MenuListEditor   content={localContent} onChange={handleContentChange} />}
          {item.type === 'card_list'     && <CardListEditor   content={localContent} onChange={handleContentChange} />}
        </div>
      )}
    </div>
  )
}
