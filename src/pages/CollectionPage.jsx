/**
 * CollectionPage.jsx — View and manage items within a single collection.
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

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Pencil, Check, X,
  AlignLeft, CheckSquare, List, LayoutList,
} from 'lucide-react'
import { useCollections, useCollectionItems } from '../hooks/useData'
import { useToast } from '../context/ToastContext'
import CollectionItem from '../components/CollectionItem'
import { Spinner, Modal } from '../components/UI'

/** Item type definitions for the "Add item" modal */
const ITEM_TYPES = [
  { type: 'textbox',       label: 'Note',      desc: 'Free-form text area (markdown)',  icon: AlignLeft,   color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  { type: 'checkbox_list', label: 'Checklist',  desc: 'Items with checkboxes',           icon: CheckSquare, color: 'text-green-400',  bg: 'bg-green-400/10'  },
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
  } = useCollectionItems(id)

  /** The collection object for this page */
  const collection = collections.find(c => c.id === id)

  // ── Local UI state ──
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerName, setHeaderName]       = useState('')
  const [headerDesc, setHeaderDesc]       = useState('')
  const [addModal, setAddModal]           = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [dirtyItems, setDirtyItems]       = useState(new Set())

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

  // ── Warn on page close if unsaved edits exist ──
  useEffect(() => {
    const handler = (e) => {
      if (dirtyItems.size > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirtyItems])

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

  // ── Drag-and-drop handlers ──
  const handleDragStart = (index) => {
    setDragIndex(index)
    dragItemRef.current = items[index]
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
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={editingHeader ? cancelEdit : startEditHeader}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
            >
              {editingHeader ? <><X size={13} /> Cancel</> : <><Pencil size={13} /> Edit</>}
            </button>
            {!editingHeader && (
              <button
                onClick={() => setAddModal(true)}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-3 py-2 text-sm font-semibold transition-colors shadow-lg shadow-accent/20"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Add item</span>
                <span className="sm:hidden">Add</span>
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
          <div className="flex justify-center py-20"><Spinner size={24} /></div>
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
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`transition-all ${
                  dragOverIndex === index && dragIndex !== index
                    ? 'border-t-2 border-accent pt-1'
                    : ''
                } ${dragIndex === index ? 'opacity-40' : ''}`}
              >
                <CollectionItem
                  item={item}
                  onUpdate={payload => update.mutateAsync(payload)}
                  onTogglePin={(itemId, pinned) => togglePin.mutate({ id: itemId, pinned })}
                  onDelete={itemId => setDeleteConfirm(itemId)}
                  onDirtyChange={handleDirtyChange}
                  dragHandleProps={{
                    onMouseDown: (e) => e.stopPropagation(),
                  }}
                />
              </div>
            ))}
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
