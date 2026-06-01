/**
 * CollectionPage.jsx - View and manage items within a single collection.
 *
 * Features:
 *   - Inline header editing (name + description)
 *   - Add items via a type-picker modal (Note / Checklist / List / Cards)
 *   - Drag-and-drop reordering (HTML5 Drag API)
 *   - Pin / delete / collapse individual items
 *   - Unsaved-changes badge + beforeunload warning
 *   - Delete confirmation modal (soft-delete → recycle bin)
 *
 * All data operations come from useCollections / useCollectionItems
 * in the hooks layer. The page only calls `.mutate()` / `.mutateAsync()`.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useBlocker } from 'react-router-dom'
import {
  ArrowLeft, Plus, Pencil, Check, X, Download, CheckSquare,
  AlignLeft, List, LayoutList,
} from 'lucide-react'
import { useCollections } from '../hooks/useCollections'
import { useCollectionItems } from '../hooks/useCollectionItems'
import { useToast } from '../context/ToastContext'
import { useRegisterPageActions } from '../context/PageActionsContext'
import {
  downloadCollectionMarkdown,
  downloadCollectionZip,
  downloadCollectionJson,
} from '../lib/exportCollection'
import CollectionItem from '../components/CollectionItem'
import BulkSelectionBar, { BULK_ICONS } from '../components/BulkSelectionBar'
import { Spinner, Modal } from '../components/ui/UI'

/** Item type definitions for the "Add item" modal */
const ITEM_TYPES = [
  { type: 'textbox',       label: 'Note',      desc: 'Free-form text area (markdown)',  icon: AlignLeft,   color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  { type: 'checkbox_list', label: 'Checklist',  desc: 'Items with checkboxes',           icon: CheckSquare, color: 'text-green-400',  bg: 'bg-green-400/10' },
  { type: 'menu_list',     label: 'List',       desc: 'Simple bullet list',              icon: List,        color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { type: 'card_list',     label: 'Cards',      desc: 'Title + description pairs',       icon: LayoutList,  color: 'text-amber-400',  bg: 'bg-amber-400/10'  },
]

export default function CollectionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Single call to useCollections (avoids duplicate subscriptions)
  const {
    data: collections = [],
    update: updateCollection,
  } = useCollections()

  const {
    data: items = [],
    isLoading,
    create,
    update,
    togglePin,
    remove,
    reorder,
    archive,
    duplicate,
    bulkRemove,
    bulkArchive,
    bulkSetPinned,
    bulkDuplicate,
  } = useCollectionItems(id)

  /** The collection object for this page */
  const collection = collections.find(c => c.id === id)

  // ── Local UI state ──
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerName, setHeaderName]       = useState('')
  const [headerDesc, setHeaderDesc]       = useState('')
  const [addModal, setAddModal]           = useState(false)
  const [exportOpen, setExportOpen]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [dirtyItems, setDirtyItems]       = useState(new Set())
  const [selectMode, setSelectMode]       = useState(false)
  const [selectedIds, setSelectedIds]     = useState(() => new Set())
  const [collapsedIds, setCollapsedIds] = useState(() => new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(null)

  const selectedCount = selectedIds.size
  const selectedItems = useMemo(
    () => items.filter(i => selectedIds.has(i.id)),
    [items, selectedIds]
  )

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  const toggleSelected = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const setItemCollapsed = useCallback((id, collapsed) => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (collapsed) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const pageActions = useMemo(() => ({
    onEscape: () => {
      setAddModal(false)
      setExportOpen(false)
      setDeleteConfirm(null)
      setBulkDeleteConfirm(null)
      setEditingHeader(false)
      exitSelectMode()
    },
  }), [exitSelectMode])
  useRegisterPageActions(pageActions)

  // ── Drag-and-drop state ──
  const [dragIndex, setDragIndex]   = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const dragItemRef = useRef(null)

  // ── Track dirty state per item for beforeunload ──
  const handleDirtyChange = useCallback((itemId, dirty) => {
    setDirtyItems(prev => {
      const next = new Set(prev)
      dirty ? next.add(itemId) : next.delete(itemId)
      return next
    })
  }, [])

  // ── Warn on page close / in-app navigation if unsaved edits exist ──
  const hasUnsaved = dirtyItems.size > 0

  useEffect(() => {
    const handler = (e) => {
      if (hasUnsaved) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsaved])

  const navBlocker = useBlocker(hasUnsaved)

  // ── Header editing helpers ──
  const startEditHeader = () => {
    setHeaderName(collection?.name || '')
    setHeaderDesc(collection?.description || '')
    setEditingHeader(true)
  }

  const saveHeader = () => {
    if (headerName.trim()) {
      updateCollection.mutate(
        { id, name: headerName.trim(), description: headerDesc.trim() },
        {
          onSuccess: () => toast.success('Collection updated'),
          onError: () => toast.error('Failed to update collection'),
        }
      )
    }
    setEditingHeader(false)
  }

  const cancelEdit = () => setEditingHeader(false)

  // ── Add item ──
  const handleAddItem = async (type) => {
    setAddModal(false)
    try {
      await create.mutateAsync({ type, title: '' })
      toast.success(`${ITEM_TYPES.find(t => t.type === type)?.label || 'Item'} added`)
    } catch {
      toast.error('Failed to add item')
    }
  }

  const handleExportCollection = async (format) => {
    setExportOpen(false)
    if (!collection) return
    try {
      if (format === 'md') downloadCollectionMarkdown(collection, items)
      else if (format === 'zip') await downloadCollectionZip(collection, items)
      else downloadCollectionJson(collection, items)
      toast.success('Export started')
    } catch {
      toast.error('Export failed')
    }
  }

  // ── Drag-and-drop handlers ──
  const handleDragStart = (index) => {
    if (selectMode) return
    setDragIndex(index)
    dragItemRef.current = items[index]
  }

  const runBulkAction = async (fn) => {
    if (selectedCount === 0) return
    const dirtySelected = [...selectedIds].some(id => dirtyItems.has(id))
    if (dirtySelected) {
      toast.error('Save or discard unsaved changes before bulk actions')
      return
    }
    try {
      await fn()
      exitSelectMode()
    } catch {
      toast.error('Bulk action failed')
    }
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    // Reorder the items array
    const reordered = [...items]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, moved)

    // Persist the new order
    reorder.mutate(reordered, {
      onError: () => toast.error('Failed to reorder items'),
    })

    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  // ── Not found state ──
  if (!collection && !isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary mb-4">Collection not found</p>
          <button onClick={() => navigate('/')} className="text-accent text-sm hover:underline">Go back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base">

      {/* ── Sticky header ──────────────────────────────── */}
      <header className="sticky top-0 z-20 glass">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Collection title & description */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-text-primary truncate">{collection?.name}</h1>
            {collection?.description && (
              <p className="text-xs text-text-muted truncate mt-0.5">{collection.description}</p>
            )}
          </div>

          {/* Unsaved badge */}
          {dirtyItems.size > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-2 py-1 shrink-0">
              {dirtyItems.size} unsaved
            </span>
          )}

          {/* Header actions */}
          <div className="flex items-center gap-2 shrink-0 relative">
            <button
              type="button"
              onClick={() => setExportOpen(v => !v)}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
              title="Export collection"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export</span>
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] py-1 bg-bg-surface border border-bg-border rounded-xl shadow-xl">
                  {[
                    { id: 'md', label: 'Markdown (.md)' },
                    { id: 'zip', label: 'Markdown zip' },
                    { id: 'json', label: 'JSON' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleExportCollection(opt.id)}
                      className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={editingHeader ? cancelEdit : startEditHeader}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
              title={editingHeader ? 'Cancel edit' : 'Edit collection'}
            >
              {editingHeader ? <X size={15} /> : <Pencil size={15} />}
              <span className="hidden sm:inline">{editingHeader ? 'Cancel' : 'Edit'}</span>
            </button>
            {items.length > 0 && !editingHeader && (
              <button
                type="button"
                onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl border text-sm font-medium transition-all ${
                  selectMode
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                }`}
              >
                <CheckSquare size={14} />
                <span className="hidden sm:inline">{selectMode ? 'Done' : 'Select'}</span>
              </button>
            )}
            {!editingHeader && (
              <button
                type="button"
                onClick={() => setAddModal(true)}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl p-2 sm:px-3 sm:py-2 text-sm font-semibold transition-colors shadow-lg shadow-accent/20"
                title="Add item"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Add item</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Inline header edit panel ──────────────────── */}
      {editingHeader && (
        <div className="bg-bg-surface border-b border-bg-border">
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Collection name</label>
              <input
                autoFocus
                value={headerName}
                onChange={e => setHeaderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveHeader(); if (e.key === 'Escape') cancelEdit() }}
                className="w-full bg-bg-elevated border border-accent/50 focus:border-accent rounded-xl px-4 py-2.5 text-sm font-medium text-text-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Description <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <input
                value={headerDesc}
                onChange={e => setHeaderDesc(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveHeader() }}
                placeholder="What's this collection for?"
                className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveHeader}
                disabled={!headerName.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Check size={14} /> Save changes
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-bg-border bg-bg-elevated hover:bg-bg-hover text-text-secondary text-sm font-medium transition-colors"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-bg-border rounded-2xl p-4 bg-bg-surface animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-16 h-6 bg-bg-elevated rounded"></div>
                  <div className="w-1/3 h-4 bg-bg-elevated rounded"></div>
                  <div className="ml-auto w-24 h-6 bg-bg-elevated rounded"></div>
                </div>
                <div className="h-16 bg-bg-elevated rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-bg-surface border border-bg-border flex items-center justify-center mx-auto mb-4">
              <Plus size={22} className="text-text-muted" />
            </div>
            <p className="text-text-secondary font-medium">Nothing here yet</p>
            <p className="text-text-muted text-sm mt-1">Add your first item to this collection</p>
            <button
              onClick={() => setAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              <Plus size={15} /> Add first item
            </button>
          </div>
        ) : (
          /* Items list with drag-and-drop */
          <div className="space-y-3 pb-24">
            {items.map((item, index) => (
              <div
                key={item.id}
                onDragOver={selectMode ? undefined : (e) => handleDragOver(e, index)}
                onDrop={selectMode ? undefined : () => handleDrop(index)}
                className={`transition-all duration-300 animate-fade-in-up ${
                  !selectMode && dragOverIndex === index && dragIndex !== index
                    ? 'border-t-2 border-accent pt-1'
                    : ''
                } ${!selectMode && dragIndex === index ? 'opacity-40 scale-95' : ''}`}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <CollectionItem
                  item={item}
                  selectMode={selectMode}
                  selected={selectedIds.has(item.id)}
                  onSelectedChange={() => toggleSelected(item.id)}
                  collapsed={collapsedIds.has(item.id)}
                  onCollapsedChange={(c) => setItemCollapsed(item.id, c)}
                  onUpdate={payload => update.mutateAsync(payload)}
                  onTogglePin={(itemId, pinned) => togglePin.mutate({ id: itemId, pinned })}
                  onDelete={itemId => setDeleteConfirm(itemId)}
                  onDuplicate={(it) => duplicate.mutate(it, {
                    onSuccess: () => toast.success('Item duplicated'),
                    onError: () => toast.error('Failed to duplicate'),
                  })}
                  onArchive={(itemId) => archive.mutate(itemId, {
                    onSuccess: () => toast.success('Item archived'),
                    onError: () => toast.error('Failed to archive'),
                  })}
                  onDirtyChange={handleDirtyChange}
                  dragHandleProps={selectMode ? {} : {
                    draggable: true,
                    onDragStart: (e) => {
                      e.stopPropagation()
                      handleDragStart(index)
                    },
                    onDragEnd: handleDragEnd,
                  }}
                />
              </div>
            ))}

            <BulkSelectionBar
              count={selectedCount}
              total={items.length}
              onClear={exitSelectMode}
              onSelectAll={() => setSelectedIds(new Set(items.map(i => i.id)))}
              actions={[
                {
                  id: 'pin',
                  label: 'Pin',
                  icon: BULK_ICONS.pin,
                  onClick: () => runBulkAction(() =>
                    bulkSetPinned.mutateAsync({ ids: [...selectedIds], pinned: true }).then(() =>
                      toast.success(`Pinned ${selectedCount} items`)
                    )
                  ),
                },
                {
                  id: 'unpin',
                  label: 'Unpin',
                  icon: BULK_ICONS.unpin,
                  onClick: () => runBulkAction(() =>
                    bulkSetPinned.mutateAsync({ ids: [...selectedIds], pinned: false }).then(() =>
                      toast.success('Unpinned items')
                    )
                  ),
                },
                {
                  id: 'collapse',
                  label: 'Collapse',
                  icon: BULK_ICONS.collapse,
                  onClick: () => {
                    setCollapsedIds(prev => {
                      const next = new Set(prev)
                      selectedIds.forEach(id => next.add(id))
                      return next
                    })
                    toast.info(`Collapsed ${selectedCount} items`)
                  },
                },
                {
                  id: 'expand',
                  label: 'Expand',
                  icon: BULK_ICONS.expand,
                  onClick: () => {
                    setCollapsedIds(prev => {
                      const next = new Set(prev)
                      selectedIds.forEach(id => next.delete(id))
                      return next
                    })
                    toast.info('Expanded items')
                  },
                },
                {
                  id: 'duplicate',
                  label: 'Duplicate',
                  icon: BULK_ICONS.copy,
                  onClick: () => runBulkAction(() =>
                    bulkDuplicate.mutateAsync(selectedItems).then(() =>
                      toast.success(`Duplicated ${selectedCount} items`)
                    )
                  ),
                },
                {
                  id: 'archive',
                  label: 'Archive',
                  icon: BULK_ICONS.archive,
                  onClick: () => runBulkAction(() =>
                    bulkArchive.mutateAsync([...selectedIds]).then(() =>
                      toast.success(`Archived ${selectedCount} items`)
                    )
                  ),
                },
                {
                  id: 'delete',
                  label: 'Delete',
                  icon: BULK_ICONS.trash,
                  variant: 'danger',
                  onClick: () => {
                    const dirtySelected = [...selectedIds].some(id => dirtyItems.has(id))
                    if (dirtySelected) {
                      toast.error('Save or discard unsaved changes first')
                      return
                    }
                    setBulkDeleteConfirm([...selectedIds])
                  },
                },
              ]}
            />
          </div>
        )}

        {/* "Add another" button at the bottom */}
        {items.length > 0 && (
          <button
            onClick={() => setAddModal(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-bg-border rounded-2xl text-text-muted hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-all text-sm font-medium"
          >
            <Plus size={16} /> Add another item
          </button>
        )}
      </main>

      {/* ── Add item type picker modal ───────────────── */}
      {addModal && (
        <Modal title="Add item" onClose={() => setAddModal(false)}>
          <p className="text-text-muted text-xs mb-3">Choose the type of content to add</p>
          <div className="grid grid-cols-2 gap-2">
            {ITEM_TYPES.map(({ type, label, desc, icon: Icon, color, bg }) => (
              <button
                key={type}
                type="button"
                onClick={() => handleAddItem(type)}
                className="flex flex-col gap-2 p-4 bg-bg-elevated hover:bg-bg-hover border border-bg-border hover:border-accent/30 rounded-xl text-left transition-all"
              >
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={16} className={color} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{label}</p>
                  <p className="text-xs text-text-muted mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Unsaved changes navigation guard ─────────── */}
      {navBlocker.state === 'blocked' && (
        <Modal
          title="Leave without saving?"
          onClose={() => navBlocker.reset()}
          footer={
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => navBlocker.reset()}
                className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded-xl border border-bg-border hover:bg-bg-elevated transition-colors"
              >
                Stay
              </button>
              <button
                onClick={() => navBlocker.proceed()}
                className="px-4 py-2.5 text-sm font-semibold bg-danger hover:bg-red-600 text-white rounded-xl transition-colors"
              >
                Leave anyway
              </button>
            </div>
          }
        >
          <p className="text-text-secondary text-sm leading-relaxed">
            You have {dirtyItems.size} {dirtyItems.size === 1 ? 'item' : 'items'} with unsaved changes.
            Leaving now may discard edits that have not been saved yet.
          </p>
        </Modal>
      )}

      {bulkDeleteConfirm && (
        <Modal
          title={`Move ${bulkDeleteConfirm.length} items to bin?`}
          onClose={() => setBulkDeleteConfirm(null)}
          footer={
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setBulkDeleteConfirm(null)}
                className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded-xl border border-bg-border hover:bg-bg-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  bulkRemove.mutate(bulkDeleteConfirm, {
                    onSuccess: () => {
                      toast.success(`Moved ${bulkDeleteConfirm.length} items to bin`)
                      setBulkDeleteConfirm(null)
                      exitSelectMode()
                    },
                    onError: () => toast.error('Failed to delete items'),
                  })
                }}
                className="px-4 py-2.5 text-sm font-semibold bg-danger hover:bg-red-600 text-white rounded-xl transition-colors"
              >
                Move to bin
              </button>
            </div>
          }
        >
          <p className="text-text-secondary text-sm leading-relaxed">
            Selected items will be moved to the recycle bin. You can restore them later.
          </p>
        </Modal>
      )}

      {/* ── Delete item confirmation modal ───────────── */}
      {deleteConfirm && (
        <Modal
          title="Move to recycle bin?"
          onClose={() => setDeleteConfirm(null)}
          footer={
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded-xl border border-bg-border hover:bg-bg-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  remove.mutate(deleteConfirm, {
                    onSuccess: () => toast.success('Item moved to recycle bin'),
                    onError: () => toast.error('Failed to delete item'),
                  })
                  setDeleteConfirm(null)
                }}
                className="px-4 py-2.5 text-sm font-semibold bg-danger hover:bg-red-600 text-white rounded-xl transition-colors"
              >
                Move to bin
              </button>
            </div>
          }
        >
          <p className="text-text-secondary text-sm leading-relaxed">
            This item will be moved to the recycle bin. You can restore it later or permanently delete it from there.
          </p>
        </Modal>
      )}
    </div>
  )
}
