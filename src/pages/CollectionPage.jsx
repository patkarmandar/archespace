import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Check, X, AlignLeft, CheckSquare, List, LayoutList } from 'lucide-react'
import { useCollections, useCollectionItems } from '../hooks/useData'
import CollectionItem from '../components/CollectionItem'
import { Spinner, Modal } from '../components/UI'

const ITEM_TYPES = [
  { type: 'textbox', label: 'Note', desc: 'Free-form text area', icon: AlignLeft, color: 'text-blue-400' },
  { type: 'checkbox_list', label: 'Checklist', desc: 'Items with checkboxes', icon: CheckSquare, color: 'text-green-400' },
  { type: 'menu_list', label: 'List', desc: 'Simple bullet list', icon: List, color: 'text-purple-400' },
  { type: 'card_list', label: 'Cards', desc: 'Title + description cards', icon: LayoutList, color: 'text-amber-400' },
]

export default function CollectionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: collections = [] } = useCollections()
  const { data: items = [], isLoading, create, update, remove } = useCollectionItems(id)
  const { update: updateCollection } = useCollections()

  const collection = collections.find(c => c.id === id)
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerName, setHeaderName] = useState('')
  const [headerDesc, setHeaderDesc] = useState('')
  const [addModal, setAddModal] = useState(false)
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
      <header className="sticky top-0 z-10 glass border-b border-bg-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            {editingHeader ? (
              <div className="flex flex-col gap-1">
                <input
                  autoFocus
                  value={headerName}
                  onChange={e => setHeaderName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveHeader(); if (e.key === 'Escape') setEditingHeader(false) }}
                  className="bg-bg-elevated border border-accent rounded-lg px-2 py-0.5 text-sm font-medium text-text-primary focus:outline-none w-full"
                />
                <input
                  value={headerDesc}
                  onChange={e => setHeaderDesc(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveHeader() }}
                  placeholder="Description…"
                  className="bg-bg-elevated border border-bg-border rounded-lg px-2 py-0.5 text-xs text-text-secondary focus:outline-none w-full"
                />
              </div>
            ) : (
              <div className="group flex items-center gap-1.5 cursor-pointer" onClick={startEditHeader}>
                <div className="min-w-0">
                  <h1 className="text-sm font-semibold text-text-primary truncate">{collection?.name}</h1>
                  {collection?.description && (
                    <p className="text-xs text-text-muted truncate">{collection.description}</p>
                  )}
                </div>
                <Pencil size={11} className="text-text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {editingHeader ? (
            <div className="flex gap-1 shrink-0">
              <button onClick={saveHeader} className="p-1.5 text-success hover:opacity-80 rounded-lg"><Check size={16} /></button>
              <button onClick={() => setEditingHeader(false)} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg"><X size={16} /></button>
            </div>
          ) : (
            <button
              onClick={() => setAddModal(true)}
              className="shrink-0 flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-3 py-1.5 text-sm font-medium transition-colors"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={24} /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-secondary mb-3">Nothing here yet</p>
            <button
              onClick={() => setAddModal(true)}
              className="text-accent text-sm hover:underline flex items-center gap-1 mx-auto"
            >
              <Plus size={14} /> Add your first item
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
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 border border-dashed border-bg-border rounded-2xl text-text-muted hover:text-accent hover:border-accent/40 transition-colors text-sm"
          >
            <Plus size={15} />
            Add another item
          </button>
        )}
      </main>

      {addModal && (
        <Modal title="Add item" onClose={() => setAddModal(false)}>
          <div className="grid grid-cols-2 gap-2">
            {ITEM_TYPES.map(({ type, label, desc, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => handleAddItem(type)}
                className="flex flex-col gap-1.5 p-3 bg-bg-elevated hover:bg-bg-hover border border-bg-border rounded-xl text-left transition-colors group"
              >
                <Icon size={18} className={`${color} group-hover:scale-110 transition-transform`} />
                <span className="text-sm font-medium text-text-primary">{label}</span>
                <span className="text-xs text-text-muted">{desc}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Delete item?" onClose={() => setDeleteConfirm(null)}>
          <p className="text-text-secondary text-sm mb-4">This item and all its content will be permanently deleted.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-hover transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { remove.mutate(deleteConfirm); setDeleteConfirm(null) }}
              className="px-4 py-2 text-sm bg-danger/90 hover:bg-danger text-white rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
