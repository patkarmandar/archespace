import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LogOut, Download, Upload, Search, Folder, Pencil, Trash2, ChevronRight, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useCollections } from '../hooks/useData'
import { Modal, Spinner } from '../components/UI'
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
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Name</label>
          <input
            autoFocus
            placeholder="Collection name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Description <span className="text-text-muted font-normal">(optional)</span></label>
          <textarea
            placeholder="What's this collection for?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-xl border border-bg-border hover:bg-bg-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-sm font-semibold bg-accent hover:bg-accent-hover text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Spinner size={12} />}
            {initial ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function DashboardPage() {
  const { signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const { data: collections = [], isLoading, create, update, remove } = useCollections()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="sticky top-0 z-20 glass">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <span className="text-lg font-semibold tracking-widest text-text-primary shrink-0">ARCHE</span>

          {/* Search — desktop */}
          <div className="flex-1 max-w-sm hidden sm:block">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                placeholder="Search collections…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-bg-elevated border border-bg-border rounded-xl pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Actions — desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium cursor-pointer">
              <Upload size={14} />
              Import
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-danger transition-all text-sm font-medium"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>

          {/* Mobile right side */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={toggle}
              className="p-2 rounded-xl border border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary transition-all"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="p-2 rounded-xl border border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
                <line x1="4" y1="18" x2="20" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-bg-border bg-bg-surface px-4 py-3 flex flex-col gap-2">
            <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-bg-border hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium cursor-pointer">
              <Upload size={15} /> Import backup
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={() => { handleExport(); setMobileMenuOpen(false) }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-bg-border hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
            >
              <Download size={15} /> Export backup
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-bg-border hover:bg-bg-elevated text-text-secondary hover:text-danger transition-all text-sm font-medium"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Mobile search */}
        <div className="sm:hidden mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              placeholder="Search collections…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-bg-surface border border-bg-border rounded-xl pl-9 pr-3 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Page heading */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Collections</h2>
            <p className="text-text-muted text-sm mt-0.5">{collections.length} {collections.length === 1 ? 'collection' : 'collections'}</p>
          </div>
          <button
            onClick={() => setModal({ type: 'create' })}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shadow-lg shadow-accent/20"
          >
            <Plus size={16} />
            New collection
          </button>
        </div>

        {/* Collections grid */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-bg-surface border border-bg-border flex items-center justify-center mx-auto mb-4">
              <Folder size={24} className="text-text-muted" />
            </div>
            <p className="text-text-secondary font-medium">{search ? 'No collections match your search' : 'No collections yet'}</p>
            <p className="text-text-muted text-sm mt-1">{search ? 'Try a different search term' : 'Create your first collection to get started'}</p>
            {!search && (
              <button
                onClick={() => setModal({ type: 'create' })}
                className="mt-4 inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                <Plus size={15} /> New collection
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(col => (
              <div
                key={col.id}
                onClick={() => navigate(`/collection/${col.id}`)}
                className="group bg-bg-surface border border-bg-border rounded-2xl p-4 cursor-pointer hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary truncate">{col.name}</h3>
                    {col.description && (
                      <p className="text-text-secondary text-sm mt-1 line-clamp-2 leading-relaxed">{col.description}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-text-muted shrink-0 mt-0.5 group-hover:text-accent transition-colors" />
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-bg-border">
                  <p className="text-text-muted text-xs">
                    {new Date(col.updated_at || col.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setModal({ type: 'edit', col })}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-bg-elevated border border-transparent hover:border-bg-border transition-all"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(col.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-all"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
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
          <p className="text-text-secondary text-sm mb-5 leading-relaxed">
            This will permanently delete the collection and all its items. This cannot be undone.
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
              className="px-4 py-2.5 text-sm font-semibold bg-danger/90 hover:bg-danger text-white rounded-xl transition-colors"
            >
              Delete collection
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
