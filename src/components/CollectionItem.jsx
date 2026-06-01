/**
 * CollectionItem.jsx - A single item card inside a collection.
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
  Pin, PinOff, Save, AlertTriangle, GripVertical, Copy, Archive,
  CheckSquare, Square,
} from 'lucide-react'
import { TextboxEditor, ChecklistEditor, MenuListEditor, CardListEditor } from './editors/ItemEditors'
import { getChecklistProgress } from '../lib/checklistProgress'
import { isOnline, enqueueOffline } from '../lib/offlineQueue'

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
  onDuplicate,
  onArchive,
  onDirtyChange,
  dragHandleProps,
  collapsed = false,
  onCollapsedChange,
  selectMode = false,
  selected = false,
  onSelectedChange,
}) {
  // ── Local state ──
  const [editingTitle, setEditingTitle]   = useState(false)
  const [titleVal, setTitleVal]           = useState(item.title)
  const [localContent, setLocalContent]   = useState(item.content)
  const [isDirty, setIsDirty]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [collapseGuard, setCollapseGuard] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [pendingSync, setPendingSync] = useState(false)

  // ── P1 Bugfix: Refs for latest state to prevent stale closures in auto-save ──
  const latestState = useRef({ title: item.title, content: item.content })
  
  useEffect(() => {
    latestState.current = { title: titleVal, content: localContent }
  }, [titleVal, localContent])

  const autoSaveTimer = useRef(null)
  const style = TYPE_STYLES[item.type]
  const checklistProgress = item.type === 'checkbox_list' ? getChecklistProgress(localContent) : null

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
  /**
   * Persist the current local state to the server.
   * Accepts optional overrides for title/content (used by auto-save
   * to avoid stale closures).
   */
  const performSave = useCallback(async (overrideTitle, overrideContent) => {
    const payload = {
      id: item.id,
      title: overrideTitle ?? latestState.current.title,
      content: overrideContent ?? latestState.current.content,
    }

    if (!isOnline()) {
      enqueueOffline({ type: 'item-update', payload })
      setIsDirty(false)
      setPendingSync(true)
      setCollapseGuard(false)
      clearTimeout(autoSaveTimer.current)
      return
    }

    setSaving(true)
    setPendingSync(false)
    try {
      await onUpdate(payload)
      setIsDirty(false)
      setCollapseGuard(false)
      clearTimeout(autoSaveTimer.current)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch {
      // Keep dirty state so the user can retry
    } finally {
      setSaving(false)
    }
  }, [item.id, onUpdate])

  useEffect(() => {
    const onFlush = () => { if (isDirty) performSave() }
    window.addEventListener('arche:flush-saves', onFlush)
    return () => window.removeEventListener('arche:flush-saves', onFlush)
  }, [isDirty, performSave])

  const handleContentChange = useCallback((newContent) => {
    setLocalContent(newContent)
    setIsDirty(true)

    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      performSave(latestState.current.title, newContent)
    }, AUTO_SAVE_DELAY)
  }, [performSave])

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
    onCollapsedChange?.(!collapsed)
  }

  /** Save the title instantly to the server without marking dirty */
  const saveTitle = async () => {
    setEditingTitle(false)
    if (titleVal !== item.title) {
      try {
        await onUpdate({
          id: item.id,
          title: titleVal,
          content: localContent,
        })
      } catch (e) {
        setTitleVal(item.title)
      }
    }
  }

  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors ${
      selected ? 'ring-2 ring-accent border-accent bg-accent/5' :
      item.pinned ? 'bg-accent/5 border-accent' : 'bg-bg-surface border-bg-border'
    }`}>
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border flex-wrap gap-y-2">
        {selectMode ? (
          <button
            type="button"
            onClick={() => onSelectedChange?.(!selected)}
            className="shrink-0 text-text-muted hover:text-accent transition-colors"
            aria-label={selected ? 'Deselect' : 'Select'}
          >
            {selected ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} />}
          </button>
        ) : (
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing shrink-0 text-text-muted hover:text-text-secondary transition-colors"
            title="Drag to reorder"
          >
            <GripVertical size={14} />
          </div>
        )}

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

        {collapsed && checklistProgress && (
          <span className="shrink-0 text-xs text-text-muted font-medium tabular-nums">
            {checklistProgress.done}/{checklistProgress.total} done
          </span>
        )}

        {/* Dirty indicator badge */}
        {pendingSync && (
          <span className="shrink-0 text-xs text-blue-400 font-medium px-2 py-0.5 bg-blue-400/10 rounded-md border border-blue-400/20">
            Pending sync
          </span>
        )}
        {savedFlash && !isDirty && !saving && (
          <span className="shrink-0 text-xs text-success font-medium px-2 py-0.5 bg-success/10 rounded-md border border-success/30">
            Saved
          </span>
        )}
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
        {!selectMode && (
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
                    type="button"
                    onClick={() => setEditingTitle(true)}
                    title="Rename"
                    className="p-2 rounded-lg border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onTogglePin(item.id, item.pinned)}
                    title={item.pinned ? 'Unpin' : 'Pin to top'}
                    className={`p-2 rounded-lg border transition-all ${
                      item.pinned
                        ? 'border-accent/30 bg-accent-muted text-accent hover:bg-accent/20'
                        : 'border-bg-border bg-bg-surface text-text-secondary hover:text-accent hover:bg-accent-muted hover:border-accent/30'
                    }`}
                  >
                    {item.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCollapseClick}
                    title={collapsed ? 'Expand' : 'Collapse'}
                    className="p-2 rounded-lg border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all"
                  >
                    {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                  </button>
                  {onDuplicate && (
                    <button
                      type="button"
                      onClick={() => onDuplicate(item)}
                      title="Duplicate"
                      className="p-2 rounded-lg border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all"
                    >
                      <Copy size={12} />
                    </button>
                  )}
                  {onArchive && (
                    <button
                      type="button"
                      onClick={() => onArchive(item.id)}
                      title="Archive"
                      className="p-2 rounded-lg border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all"
                    >
                      <Archive size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    title="Delete"
                    className="p-2 rounded-lg border border-bg-border bg-bg-surface hover:bg-danger/10 hover:border-danger/30 hover:text-danger text-text-secondary transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
        )}
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
              onClick={() => { handleDiscard(); onCollapsedChange?.(true) }}
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
