import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Check, X, AlignLeft, CheckSquare, List, LayoutList } from 'lucide-react'
import { useCollections, useCollectionItems } from '../hooks/useData'
import CollectionItem from '../components/CollectionItem'
import { Spinner, Modal } from '../components/UI'

const ITEM_TYPES = [
  { type: 'textbox',       label: 'Note',      desc: 'Free-form text area',       icon: AlignLeft,   color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  { type: 'checkbox_list', label: 'Checklist', desc: 'Items with checkboxes',      icon: CheckSquare, color: 'text-green-400',  bg: 'bg-green-400/10'  },
  { type: 'menu_list',     label: 'List',      desc: 'Simple bullet list',          icon: List,        color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { type: 'card_list',     label: 'Cards',     desc: 'Title + description pairs',   icon: LayoutList,  color: 'text-amber-400',  bg: 'bg-amber-400/10'  },
]

export default function CollectionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: collections = [] } = useCollections()
  const { data: items = [], isLoading, create, update, remove } = useCollectionItems(id)
  const { update: updateCollection } = useCollections()

  const collection = collections.find(c => c.id === id)
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerName, setHeaderName]       = useState('')
  const [headerDesc, setHeaderDesc]       = useState('')
  const [addModal, setAddModal]           = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const startEditHeader = () => {
    setHeaderName(collection?.name || '')
    setHeaderDesc(collection?.description || '')
    setEditingHeader(true)
  }

  const saveHeader = () => {
    if (headerName.trim()) {
      updateCollection.mutate({ id, name: headerName.trim(), description: headerDesc.trim() })
    }
    setEditingHeader(false)
  }

  const cancelEdit = () => setEditingHeader(false)

  const handleAddItem = async (type) => {
    setAddModal(false)
    await create.mutateAsync({ type, title: '' })
  }

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

      {/* ── Sticky header — fixed height, never grows ── */}
      <header className="sticky top-0 z-20 glass">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">

          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Title (read-only in header) */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-text-primary truncate">{collection?.name}</h1>
            {collection?.description && (
              <p className="text-xs text-text-muted truncate mt-0.5">{collection.description}</p>
            )}
          </div>

          {/* Actions */}
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

      {/* ── Inline edit panel — below header, never inside it ── */}
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
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Description <span className="text-text-muted font-normal">(optional)</span></label>
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

      {/* ── Main content ── */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={24} /></div>
        ) : items.length === 0 ? (
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
          <div className="space-y-3">
            {items.map(item => (
              <CollectionItem
                key={item.id}
                item={item}
                onUpdate={payload => update.mutate(payload)}
                onDelete={itemId => setDeleteConfirm(itemId)}
              />
            ))}
          </div>
        )}

        {items.length > 0 && (
          <button
            onClick={() => setAddModal(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-bg-border rounded-2xl text-text-muted hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-all text-sm font-medium"
          >
            <Plus size={16} /> Add another item
          </button>
        )}
      </main>

      {/* ── Add item modal ── */}
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

      {/* ── Delete item confirm ── */}
      {deleteConfirm && (
        <Modal title="Delete item?" onClose={() => setDeleteConfirm(null)}>
          <p className="text-text-secondary text-sm mb-5 leading-relaxed">
            This item and all its content will be permanently deleted.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded-xl border border-bg-border hover:bg-bg-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { remove.mutate(deleteConfirm); setDeleteConfirm(null) }}
              className="px-4 py-2.5 text-sm font-semibold bg-danger text-white rounded-xl hover:bg-red-600 transition-colors"
            >
              Delete item
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
