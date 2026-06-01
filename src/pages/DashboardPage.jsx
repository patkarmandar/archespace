/**
 * DashboardPage.jsx - Main entry point for authenticated users.
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

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Plus, LogOut, Download, Upload, Search, Folder,
  Trash2, Sun, Moon, Archive, Command, CheckSquare,
} from 'lucide-react'
import { useCommandPalette } from '../context/CommandPaletteContext'
import { MULTI_USER_ENABLED } from '../lib/appConfig'
import BulkSelectionBar, { BULK_ICONS } from '../components/BulkSelectionBar'
import { useAuth } from '../context/AuthContext'
import { useEncryption } from '../context/EncryptionContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { useRegisterPageActions } from '../context/PageActionsContext'
import { useCollections } from '../hooks/useCollections'
import { useRecycleBin } from '../hooks/useRecycleBin'
import { useArchive } from '../hooks/useArchive'
import { useCollectionStats } from '../hooks/useCollectionStats'
import { exportCollections, importCollections } from '../lib/exportImport'
import { Modal } from '../components/ui/UI'
import { CollectionModal } from '../components/collection/CollectionModal'
import { CollectionCard } from '../components/collection/CollectionCard'
import GlobalSearch from '../components/GlobalSearch'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const { cryptoKey } = useEncryption()
  const { theme, toggle } = useTheme()
  const { toast } = useToast()
  const { openPalette } = useCommandPalette()
  const {
    data: collections = [], isLoading, create, update, togglePin, remove, reorder,
    archive, duplicate, bulkRemove, bulkArchive, bulkSetPinned, bulkDuplicate,
  } = useCollections()
  const { total: binTotal } = useRecycleBin()
  const { total: archiveTotal } = useArchive()
  const { data: stats = {} } = useCollectionStats()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const headerRef = useRef(null)
  const searchInputRef = useRef(null)

  // ── Local state ──
  const [modal, setModal] = useState(null) // { type: 'create' } | { type: 'edit', col } | null
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(null)

  const selectedCount = selectedIds.size
  const selectedCollections = useMemo(
    () => collections.filter(c => selectedIds.has(c.id)),
    [collections, selectedIds]
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

  const pageActions = useMemo(() => ({
    onNewCollection: () => setModal({ type: 'create' }),
    onExport: () => handleExportRef.current?.(),
    onOpenSearch: () => setGlobalSearchOpen(true),
    onEscape: () => {
      setModal(null)
      setDeleteConfirm(null)
      setGlobalSearchOpen(false)
      setMobileMenuOpen(false)
      setBulkDeleteConfirm(null)
      exitSelectMode()
    },
  }), [exitSelectMode])

  useRegisterPageActions(pageActions)

  const handleExportRef = useRef(null)

  // Close mobile menu when clicking outside the header
  useEffect(() => {
    if (!mobileMenuOpen) return
    const handlePointerDown = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [mobileMenuOpen])

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
      await exportCollections(collections, cryptoKey)
      toast.success('Backup exported successfully')
      setMobileMenuOpen(false)
    } catch (err) {
      toast.error('Failed to export backup')
      console.error(err)
    }
  }
  handleExportRef.current = handleExport

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      await importCollections(file, user.id, cryptoKey)
      await queryClient.invalidateQueries({ queryKey: ['collections'] })
      await queryClient.invalidateQueries({ queryKey: ['bin'] })
      toast.success('Backup imported successfully')
    } catch (err) {
      toast.error('Failed to import backup - invalid format')
      console.error(err)
    }

    e.target.value = '' // reset input
    setMobileMenuOpen(false)
  }

  // ── Drag-and-drop handlers ──
  const handleDragStart = (index) => {
    if (search || selectMode) return
    setDragIndex(index)
  }

  const handleDragOver = (e, index) => {
    if (search) return
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (filteredIndex) => {
    if (search || dragIndex === null || dragIndex === filteredIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    const fromId = filtered[dragIndex]?.id
    const toId = filtered[filteredIndex]?.id
    if (!fromId || !toId) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    const reordered = [...collections]
    const fromIdx = reordered.findIndex(c => c.id === fromId)
    const toIdx = reordered.findIndex(c => c.id === toId)
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)

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
      <header ref={headerRef} className="sticky top-0 z-20 glass">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="shrink-0">
            <span className="text-lg font-semibold tracking-widest text-text-primary">ARCHE</span>
            {MULTI_USER_ENABLED && user?.email && (
              <p className="text-[10px] text-text-muted truncate max-w-[140px] sm:max-w-[200px]">{user.email}</p>
            )}
          </div>

          {/* Search - desktop */}
          <div className="flex-1 max-w-sm hidden sm:block">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                ref={searchInputRef}
                placeholder="Search collections…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-bg-elevated border border-bg-border rounded-xl pl-9 pr-12 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-mono hidden sm:inline">/</kbd>
            </div>
          </div>

          {/* Actions - desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button
              type="button"
              onClick={() => openPalette()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
              title="Commands (⌘K)"
            >
              <Command size={14} />
              <span className="hidden md:inline">Commands</span>
            </button>
            <button
              type="button"
              onClick={() => setGlobalSearchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
              title="Search everywhere (/)"
            >
              <Search size={14} />
              <span className="hidden md:inline">Search</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/archive')}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
            >
              <Archive size={14} />
              Archive
              {archiveTotal > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold px-1 leading-none">
                  {archiveTotal > 99 ? '99+' : archiveTotal}
                </span>
              )}
            </button>
            <button
              type="button"
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

          {/* Actions - mobile right side */}
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
              type="button"
              onClick={() => openPalette()}
              className="p-2 rounded-xl border border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary transition-all"
              title="Commands (⌘K)"
            >
              <Command size={16} />
            </button>
            <button
              type="button"
              onClick={() => setGlobalSearchOpen(true)}
              className="p-2 rounded-xl border border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary transition-all"
              title="Search (/)"
            >
              <Search size={16} />
            </button>
            <button
              type="button"
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
            <button
              type="button"
              onClick={() => { navigate('/archive'); setMobileMenuOpen(false) }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-bg-border hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
            >
              <Archive size={15} /> Archive
            </button>
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
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Collections</h2>
            <p className="text-text-muted text-sm mt-0.5">
              {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  selectMode
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary'
                }`}
              >
                <CheckSquare size={16} />
                {selectMode ? 'Done' : 'Select'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setModal({ type: 'create' })}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shadow-lg shadow-accent/20"
            >
              <Plus size={16} />
              New collection
            </button>
          </div>
        </div>

        {/* Collections grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-bg-border rounded-2xl p-4 bg-bg-surface animate-pulse">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-5 bg-bg-elevated rounded w-2/3"></div>
                    <div className="h-3 bg-bg-elevated rounded w-full"></div>
                    <div className="h-3 bg-bg-elevated rounded w-4/5"></div>
                  </div>
                  <div className="w-4 h-4 bg-bg-elevated rounded shrink-0"></div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-bg-border">
                  <div className="w-16 h-3 bg-bg-elevated rounded"></div>
                  <div className="flex gap-1">
                    <div className="w-12 h-6 bg-bg-elevated rounded"></div>
                    <div className="w-12 h-6 bg-bg-elevated rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-24">
            {filtered.map((col, index) => (
              <CollectionCard
                key={col.id}
                col={col}
                index={index}
                search={search}
                stats={stats}
                selectMode={selectMode}
                selected={selectedIds.has(col.id)}
                onToggleSelect={() => toggleSelected(col.id)}
                dragIndex={dragIndex}
                dragOverIndex={dragOverIndex}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
                handleDragEnd={handleDragEnd}
                navigate={navigate}
                togglePin={togglePin}
                setModal={setModal}
                setDeleteConfirm={setDeleteConfirm}
                onDuplicate={(id) => duplicate.mutate(id, {
                  onSuccess: () => toast.success('Collection duplicated'),
                  onError: () => toast.error('Failed to duplicate'),
                })}
                onArchive={(id) => archive.mutate(id, {
                  onSuccess: () => toast.success('Collection archived'),
                  onError: () => toast.error('Failed to archive'),
                })}
              />
            ))}
            <BulkSelectionBar
              count={selectedCount}
              total={filtered.length}
              onClear={exitSelectMode}
              onSelectAll={() => setSelectedIds(new Set(filtered.map(c => c.id)))}
              actions={[
                {
                  id: 'pin',
                  label: 'Pin',
                  icon: BULK_ICONS.pin,
                  onClick: async () => {
                    try {
                      await bulkSetPinned.mutateAsync({ ids: [...selectedIds], pinned: true })
                      toast.success(`Pinned ${selectedCount} collections`)
                      exitSelectMode()
                    } catch { toast.error('Failed to pin') }
                  },
                },
                {
                  id: 'unpin',
                  label: 'Unpin',
                  icon: BULK_ICONS.unpin,
                  onClick: async () => {
                    try {
                      await bulkSetPinned.mutateAsync({ ids: [...selectedIds], pinned: false })
                      toast.success('Unpinned collections')
                      exitSelectMode()
                    } catch { toast.error('Failed to unpin') }
                  },
                },
                {
                  id: 'duplicate',
                  label: 'Duplicate',
                  icon: BULK_ICONS.copy,
                  onClick: async () => {
                    try {
                      await bulkDuplicate.mutateAsync(selectedCollections)
                      toast.success(`Duplicated ${selectedCount} collections`)
                      exitSelectMode()
                    } catch { toast.error('Failed to duplicate') }
                  },
                },
                {
                  id: 'archive',
                  label: 'Archive',
                  icon: BULK_ICONS.archive,
                  onClick: async () => {
                    try {
                      await bulkArchive.mutateAsync([...selectedIds])
                      toast.success(`Archived ${selectedCount} collections`)
                      exitSelectMode()
                    } catch { toast.error('Failed to archive') }
                  },
                },
                {
                  id: 'delete',
                  label: 'Delete',
                  icon: BULK_ICONS.trash,
                  variant: 'danger',
                  onClick: () => setBulkDeleteConfirm([...selectedIds]),
                },
              ]}
            />
          </div>
        )}
      </main>

      {/* ── Modals ────────────────────────────────────── */}
      {modal?.type === 'create' && (
        <CollectionModal
          onSave={({ name, description, color, tags }) => {
            create.mutate({ name, description, color, tags }, {
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
          onSave={({ name, description, color, tags }) => {
            update.mutate({ id: modal.col.id, name, description, color, tags }, {
              onSuccess: () => toast.success('Collection updated'),
              onError: () => toast.error('Failed to update collection')
            })
          }}
          onClose={() => setModal(null)}
        />
      )}
      {bulkDeleteConfirm && (
        <Modal
          title={`Move ${bulkDeleteConfirm.length} collections to bin?`}
          onClose={() => setBulkDeleteConfirm(null)}
          footer={
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setBulkDeleteConfirm(null)}
                className="px-4 py-2.5 text-sm font-medium text-text-secondary rounded-xl border border-bg-border hover:bg-bg-elevated"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  bulkRemove.mutate(bulkDeleteConfirm, {
                    onSuccess: () => {
                      toast.success(`Moved ${bulkDeleteConfirm.length} collections to bin`)
                      setBulkDeleteConfirm(null)
                      exitSelectMode()
                    },
                    onError: () => toast.error('Failed to delete'),
                  })
                }}
                className="px-4 py-2.5 text-sm font-semibold bg-danger text-white rounded-xl"
              >
                Move to bin
              </button>
            </div>
          }
        >
          <p className="text-text-secondary text-sm">All items inside these collections go to the bin as well.</p>
        </Modal>
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

      <GlobalSearch open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
    </div>
  )
}
