/**
 * DashboardPage.jsx — Main entry point for authenticated users.
 *
 * Displays a grid of the user's collections.
 *
 * Features:
 *   - Create / Edit / Delete collections
 *   - Pin collections to top
 *   - Search collections by name or description
 *   - Export / Import backup (JSON)
 *   - Access the Recycle Bin
 *   - Toggle dark/light theme
 *   - Sign out
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, LogOut, Download, Upload, Search, Folder,
  Pencil, Trash2, ChevronRight, Sun, Moon, Pin, PinOff
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { useCollections, useRecycleBin, exportCollections, importCollections } from '../hooks/useData'
import { Modal, Spinner } from '../components/UI'

/**
 * Modal for creating or editing a collection.
 * @param {{ initial?: Object, onSave: Function, onClose: Function }} props
 */
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
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Description <span className="text-text-muted font-normal">(optional)</span>
          </label>
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
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const { toast } = useToast()
  const { data: collections = [], isLoading, create, update, togglePin, remove, reorder } = useCollections()
  const { total: binTotal } = useRecycleBin()
  const navigate = useNavigate()

  // ── Local state ──
  const [modal, setModal] = useState(null) // { type: 'create' } | { type: 'edit', col } | null
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // ── Drag-and-drop state ──
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  // ── Derived state ──
  const filtered = collections.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  )

  // ── Actions ──
  const handleExport = async () => {
    try {
      await exportCollections(collections)
      toast.success('Backup exported successfully')
      setMobileMenuOpen(false)
    } catch (err) {
      toast.error('Failed to export backup')
      console.error(err)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      await importCollections(file, user.id)
      toast.success('Backup imported successfully')
    } catch (err) {
      toast.error('Failed to import backup — invalid format')
      console.error(err)
    }

    e.target.value = '' // reset input
    setMobileMenuOpen(false)
  }

  // ── Drag-and-drop handlers ──
  const handleDragStart = (index) => {
    if (search) return // Disable dragging while searching
    setDragIndex(index)
  }

  const handleDragOver = (e, index) => {
    if (search) return
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (index) => {
    if (search || dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    const reordered = [...collections]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, moved)

    reorder.mutate(reordered, {
      onError: () => toast.error('Failed to reorder collections'),
    })

    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* ── Header ────────────────────────────────────── */}
      <header className="sticky top-0 z-20 glass">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
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
            <button
              onClick={() => navigate('/recycle-bin')}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
            >
              <Trash2 size={14} />
              Bin
              {binTotal > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1 leading-none">
                  {binTotal > 99 ? '99+' : binTotal}
                </span>
              )}
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
              onClick={() => {
                signOut()
                toast.info('Signed out')
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-danger transition-all text-sm font-medium"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>

          {/* Actions — mobile right side */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={toggle}
              className="p-2 rounded-xl border border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary transition-all"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => navigate('/recycle-bin')}
              className="relative p-2 rounded-xl border border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary transition-all"
            >
              <Trash2 size={16} />
              {binTotal > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1 leading-none">
                  {binTotal > 99 ? '99+' : binTotal}
                </span>
              )}
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
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-bg-border hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
            >
              <Download size={15} /> Export backup
            </button>
            <button
              onClick={() => {
                signOut()
                toast.info('Signed out')
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-bg-border hover:bg-bg-elevated text-text-secondary hover:text-danger transition-all text-sm font-medium"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
      </header>

      {/* ── Main content ──────────────────────────────── */}
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
                draggable={!search}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                onClick={() => navigate(`/collection/${col.id}`)}
                className={`group border rounded-2xl p-4 cursor-pointer hover:shadow-lg hover:shadow-accent/5 transition-all ${
                  col.pinned ? 'bg-accent/5 border-accent hover:border-accent/80' : 'bg-bg-surface border-bg-border hover:border-accent/40'
                } ${
                  dragOverIndex === index && dragIndex !== index
                    ? 'border-l-4 border-l-accent pl-3'
                    : ''
                } ${dragIndex === index ? 'opacity-40' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {col.pinned && <Pin size={11} className="text-accent shrink-0 fill-accent" />}
                      <h3 className="font-semibold text-text-primary truncate">{col.name}</h3>
                    </div>
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
                      onClick={() => togglePin.mutate({ id: col.id, pinned: col.pinned })}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        col.pinned
                          ? 'border-accent/30 bg-accent-muted text-accent hover:bg-accent/20'
                          : 'border-bg-border bg-bg-surface text-text-secondary hover:text-accent hover:bg-accent-muted hover:border-accent/30'
                      }`}
                    >
                      {col.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                      {col.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => setModal({ type: 'edit', col })}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(col.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-bg-border bg-bg-surface text-text-secondary hover:text-danger hover:bg-danger/10 hover:border-danger/30 focus:text-danger focus:bg-danger/10 focus:border-danger/30 active:bg-danger/15 transition-all"
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

      {/* ── Modals ────────────────────────────────────── */}
      {modal?.type === 'create' && (
        <CollectionModal
          onSave={({ name, description }) => {
            create.mutate({ name, description }, {
              onSuccess: () => toast.success('Collection created'),
              onError: () => toast.error('Failed to create collection')
            })
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit' && (
        <CollectionModal
          initial={modal.col}
          onSave={({ name, description }) => {
            update.mutate({ id: modal.col.id, name, description }, {
              onSuccess: () => toast.success('Collection updated'),
              onError: () => toast.error('Failed to update collection')
            })
          }}
          onClose={() => setModal(null)}
        />
      )}
      {deleteConfirm && (
        <Modal
          title="Move collection to bin?"
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
                    onSuccess: () => toast.success('Collection moved to bin'),
                    onError: () => toast.error('Failed to delete collection')
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
            This collection and all its items will be moved to the recycle bin.
            You can restore them later or permanently delete them from there.
          </p>
        </Modal>
      )}
    </div>
  )
}
