import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LogOut, Download, Upload, Search, Folder, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCollections } from '../hooks/useData'
import { Modal, Spinner, IconButton } from '../components/UI'
import { supabase } from '../lib/supabase'

function CollectionModal({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), description: description.trim() })
    setSaving(false)
    onClose()
  }

  return (
    <Modal title={initial ? 'Edit collection' : 'New collection'} onClose={onClose}>
      <div className="space-y-3">
        <input
          autoFocus
          placeholder="Collection name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm"
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm resize-none"
        />
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-hover transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Spinner size={12} />}
            {initial ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function DashboardPage() {
  const { signOut } = useAuth()
  const { data: collections = [], isLoading, create, update, remove } = useCollections()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const filtered = collections.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  )

  const handleExport = async () => {
    const allItems = await Promise.all(
      collections.map(async c => {
        const { data } = await supabase.from('collection_items').select('*').eq('collection_id', c.id).order('position')
        return { ...c, items: data || [] }
      })
    )
    const blob = new Blob([JSON.stringify(allItems, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arche-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    const parsed = JSON.parse(text)
    const { data: { user } } = await supabase.auth.getUser()
    for (const col of parsed) {
      const { items, id, created_at, updated_at, user_id, ...colData } = col
      const { data: newCol } = await supabase.from('collections').insert({ ...colData, user_id: user.id }).select().single()
      if (newCol && items?.length) {
        const itemsToInsert = items.map(({ id, collection_id, ...item }) => ({
          ...item, collection_id: newCol.id
        }))
        await supabase.from('collection_items').insert(itemsToInsert)
      }
    }
    e.target.value = ''
  }

  const typeLabels = { textbox: 'Note', checkbox_list: 'Checklist', menu_list: 'List', card_list: 'Cards' }

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="sticky top-0 z-10 glass border-b border-bg-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent-muted border border-accent/20 flex items-center justify-center">
              <span className="text-sm font-semibold text-accent">A</span>
            </div>
            <span className="font-semibold text-text-primary tracking-tight">Arche</span>
          </div>

          <div className="flex-1 max-w-xs hidden sm:block">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                placeholder="Search collections…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-bg-elevated border border-bg-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <label title="Import backup" className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer">
              <Upload size={16} />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <IconButton onClick={handleExport} title="Export backup"><Download size={16} /></IconButton>
            <IconButton onClick={signOut} title="Sign out"><LogOut size={16} /></IconButton>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="sm:hidden mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              placeholder="Search collections…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-bg-surface border border-bg-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Collections</h2>
            <p className="text-text-muted text-sm">{collections.length} total</p>
          </div>
          <button
            onClick={() => setModal({ type: 'create' })}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">New collection</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Folder size={32} className="mx-auto text-text-muted mb-3 opacity-50" />
            <p className="text-text-secondary">{search ? 'No collections match your search' : 'No collections yet'}</p>
            {!search && (
              <button onClick={() => setModal({ type: 'create' })} className="mt-3 text-accent text-sm hover:underline">
                Create your first collection
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(col => (
              <div
                key={col.id}
                onClick={() => navigate(`/collection/${col.id}`)}
                className="group bg-bg-surface border border-bg-border rounded-2xl p-4 cursor-pointer hover:border-accent/30 hover:bg-bg-elevated transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary truncate">{col.name}</h3>
                    {col.description && (
                      <p className="text-text-secondary text-sm mt-0.5 line-clamp-2">{col.description}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-text-muted shrink-0 mt-0.5 group-hover:text-accent transition-colors" />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-text-muted text-xs">
                    {new Date(col.updated_at || col.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <IconButton onClick={() => setModal({ type: 'edit', col })} title="Edit">
                      <Pencil size={13} />
                    </IconButton>
                    <IconButton danger onClick={() => setDeleteConfirm(col.id)} title="Delete">
                      <Trash2 size={13} />
                    </IconButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modal?.type === 'create' && (
        <CollectionModal
          onSave={({ name, description }) => create.mutateAsync({ name, description })}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit' && (
        <CollectionModal
          initial={modal.col}
          onSave={({ name, description }) => update.mutateAsync({ id: modal.col.id, name, description })}
          onClose={() => setModal(null)}
        />
      )}
      {deleteConfirm && (
        <Modal title="Delete collection?" onClose={() => setDeleteConfirm(null)}>
          <p className="text-text-secondary text-sm mb-4">This will permanently delete the collection and all its items. This cannot be undone.</p>
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
