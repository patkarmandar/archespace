/**
 * SpaceItem.jsx - A single item card inside a space.
 *
 * Renders a collapsible card with:
 *   - Type badge (Note / Checklist / List / Cards)
 *   - Inline-editable title
 *   - Pin / collapse / delete actions
 *   - The appropriate editor component for the item type
 *   - Unsaved-changes indicator + Save / Discard buttons
 *   - Auto-save: debounced save after 5 seconds of inactivity
 *   - Collapse guard: warns before collapsing with unsaved edits
 *   - Drag handle for reordering
 *
 * The component manages its own local copy of `title` and `content`
 * so edits feel instant. Changes are marked "dirty" and flushed
 * to the server either manually (Save button) or automatically
 * (auto-save after 5s).
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Trash2, ChevronDown, ChevronUp, Pencil, Check, X,
  Pin, PinOff, Save, AlertTriangle, GripVertical, Copy, Archive,
  CheckSquare, Square, Maximize2, Minimize2,
} from 'lucide-react'
import { TextboxEditor, ChecklistEditor, MenuListEditor, CardListEditor } from './editors/ItemEditors'
import { ActionMenu } from './ui/ActionMenu'
import { getChecklistProgress } from '../lib/checklistProgress'
import { isOnline, enqueueOffline } from '../lib/offlineQueue'
import { useEncryption } from '../context/EncryptionContext'
import { encryptItem } from '../lib/dataProtection'
import { TYPE_LABELS, TYPE_STYLES } from '../lib/itemTypes'
import { AUTO_SAVE_DELAY_MS } from '../lib/constants'

/**
 * @param {{ item: Object, onUpdate: Function, onTogglePin: Function, onDelete: Function, onDirtyChange?: Function, dragHandleProps?: Object }} props
 */
export default function SpaceItem({
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
  const { cryptoKey } = useEncryption()

  // ── Local state ──
  const [editingTitle, setEditingTitle]   = useState(false)
  const [titleVal, setTitleVal]           = useState(item.title)
  const [localContent, setLocalContent]   = useState(item.content)
  const [isDirty, setIsDirty]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [collapseGuard, setCollapseGuard] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [pendingSync, setPendingSync] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  useEffect(() => {
    if (!isFullscreen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsFullscreen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

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
      const encrypted = await encryptItem(
        { title: payload.title, content: payload.content },
        cryptoKey
      )
      enqueueOffline({
        type: 'item-update',
        payload: {
          id: payload.id,
          title: encrypted.title,
          content: encrypted.content,
        },
      })
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
  }, [item.id, onUpdate, cryptoKey])

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
    }, AUTO_SAVE_DELAY_MS)
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

  const handleFullscreenClick = () => {
    if (!isFullscreen && collapsed) {
      onCollapsedChange?.(false)
      setCollapseGuard(false)
    }
    setIsFullscreen(v => !v)
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
      } catch {
        setTitleVal(item.title)
      }
    }
  }

  const itemCard = (
    <div className={`${
      isFullscreen
        ? 'fixed inset-0 z-[80] flex flex-col rounded-none border-0 bg-bg-base'
        : 'relative border rounded-2xl'
    } transition-colors ${
      selected && !isFullscreen ? 'ring-2 ring-accent border-accent bg-accent/5' :
      item.pinned && !isFullscreen ? 'bg-accent/5 border-accent' :
      !isFullscreen ? 'bg-bg-surface border-bg-border' : ''
    }`}>
      {/* ── Header ────────────────────────────────────── */}
      <div className={`flex items-center gap-2 px-4 py-3 flex-wrap gap-y-2 ${
        isFullscreen ? 'sticky top-0 z-10 bg-bg-surface/95 backdrop-blur-md' : ''
      } ${
        !collapsed || collapseGuard ? 'border-b border-bg-border' : ''
      }`}>
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
                    onClick={handleCollapseClick}
                    className="p-2 rounded-lg border border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
                    aria-label={collapsed ? 'Expand item' : 'Collapse item'}
                    title={collapsed ? 'Expand' : 'Collapse'}
                  >
                    {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                  <ActionMenu
                    label="Item actions"
                    actions={[
                      {
                        id: 'pin',
                        label: item.pinned ? 'Unpin' : 'Pin',
                        icon: item.pinned ? PinOff : Pin,
                        active: item.pinned,
                        onClick: () => onTogglePin(item.id, item.pinned),
                      },
                      {
                        id: 'fullscreen',
                        label: isFullscreen ? 'Exit full screen' : 'Full screen',
                        icon: isFullscreen ? Minimize2 : Maximize2,
                        active: isFullscreen,
                        onClick: handleFullscreenClick,
                      },
                      { id: 'rename', label: 'Rename', icon: Pencil, onClick: () => setEditingTitle(true) },
                      onDuplicate && { id: 'duplicate', label: 'Duplicate', icon: Copy, onClick: () => onDuplicate(item) },
                      onArchive && { id: 'archive', label: 'Archive', icon: Archive, onClick: () => onArchive(item.id) },
                      { id: 'delete', label: 'Delete', icon: Trash2, variant: 'danger', onClick: () => onDelete(item.id) },
                    ]}
                  />
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
        <div className={isFullscreen ? 'flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8' : 'px-4 py-4'}>
          {/* Render only the editor for this item's type (not all four) */}
          {item.type === 'textbox'       && <TextboxEditor    content={localContent} onChange={handleContentChange} />}
          {item.type === 'checkbox_list' && <ChecklistEditor  content={localContent} onChange={handleContentChange} />}
          {item.type === 'menu_list'     && <MenuListEditor   content={localContent} onChange={handleContentChange} />}
          {item.type === 'card_list'     && <CardListEditor   content={localContent} onChange={handleContentChange} />}
        </div>
      )}
    </div>
  )

  return isFullscreen ? createPortal(itemCard, document.body) : itemCard
}
