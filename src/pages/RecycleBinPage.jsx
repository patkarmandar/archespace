/**
 * RecycleBinPage.jsx — Manage soft-deleted items and collections.
 *
 * Soft-deleted records are kept here and can be permanently purged
 * or restored to their original location.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, RotateCcw, Folder, LayoutList, AlertTriangle } from 'lucide-react'
import { useRecycleBin } from '../hooks/useData'
import { useToast } from '../context/ToastContext'
import { Spinner, Modal } from '../components/UI'

const TYPE_LABELS = {
  textbox: 'Note', checkbox_list: 'Checklist', menu_list: 'List', card_list: 'Cards',
}

/** Formats a date string into "Today", "Yesterday", or "X days ago" */
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export default function RecycleBinPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data, isLoading, restoreCollection, purgeCollection, restoreItem, purgeItem, emptyBin, total } = useRecycleBin()
  
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [confirmPurge, setConfirmPurge] = useState(null) // { type: 'collection' | 'item', id, name }

  const collections = data?.collections || []
  const items = data?.items || []

  // ── Actions ──
  const handleEmptyBin = async () => {
    try {
      await emptyBin.mutateAsync()
      toast.success('Recycle bin emptied')
      setConfirmEmpty(false)
    } catch {
      toast.error('Failed to empty recycle bin')
    }
  }

  const handlePurge = async () => {
    if (!confirmPurge) return
    try {
      if (confirmPurge.type === 'collection') {
        await purgeCollection.mutateAsync(confirmPurge.id)
      } else {
        await purgeItem.mutateAsync(confirmPurge.id)
      }
      toast.success('Permanently deleted')
      setConfirmPurge(null)
    } catch {
      toast.error('Failed to delete permanently')
    }
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="sticky top-0 z-20 glass">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-text-primary">Recycle Bin</h1>
            <p className="text-xs text-text-muted mt-0.5">{total} {total === 1 ? 'item' : 'items'} — deleted items are kept here until permanently removed</p>
          </div>

          {total > 0 && (
            <button
              onClick={() => setConfirmEmpty(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-danger/10 hover:border-danger/30 hover:text-danger text-text-secondary transition-all text-sm font-medium"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Empty bin</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={24} /></div>
        ) : total === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-bg-surface border border-bg-border flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-text-muted" />
            </div>
            <p className="text-text-secondary font-medium">Recycle bin is empty</p>
            <p className="text-text-muted text-sm mt-1">Deleted collections and items will appear here</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── Deleted Collections ── */}
            {collections.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Folder size={14} className="text-text-muted" />
                  <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Collections</h2>
                  <span className="text-xs text-text-muted">({collections.length})</span>
                </div>
                <div className="space-y-2">
                  {collections.map(col => (
                    <div key={col.id} className="bg-bg-surface border border-bg-border rounded-2xl p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{col.name}</p>
                        {col.description && (
                          <p className="text-xs text-text-muted truncate mt-0.5">{col.description}</p>
                        )}
                        <p className="text-xs text-text-muted mt-1">Deleted {timeAgo(col.deleted_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => restoreCollection.mutate(col.id, {
                            onSuccess: () => toast.success('Collection restored'),
                            onError: () => toast.error('Failed to restore collection')
                          })}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-success/10 hover:border-success/30 hover:text-success text-text-secondary transition-all text-xs font-medium"
                        >
                          <RotateCcw size={13} /> Restore
                        </button>
                        <button
                          onClick={() => setConfirmPurge({ type: 'collection', id: col.id, name: col.name })}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-danger/10 hover:border-danger/30 hover:text-danger text-text-secondary transition-all text-xs font-medium"
                        >
                          <Trash2 size={13} /> Delete forever
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Deleted Items ── */}
            {items.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <LayoutList size={14} className="text-text-muted" />
                  <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Items</h2>
                  <span className="text-xs text-text-muted">({items.length})</span>
                </div>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="bg-bg-surface border border-bg-border rounded-2xl p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-text-muted bg-bg-elevated px-2 py-0.5 rounded-md border border-bg-border">
                            {TYPE_LABELS[item.type]}
                          </span>
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {item.title || 'Untitled'}
                          </p>
                        </div>
                        <p className="text-xs text-text-muted mt-1">Deleted {timeAgo(item.deleted_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => restoreItem.mutate(item.id, {
                            onSuccess: () => toast.success('Item restored'),
                            onError: () => toast.error('Failed to restore item')
                          })}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-success/10 hover:border-success/30 hover:text-success text-text-secondary transition-all text-xs font-medium"
                        >
                          <RotateCcw size={13} /> Restore
                        </button>
                        <button
                          onClick={() => setConfirmPurge({ type: 'item', id: item.id, name: item.title || 'Untitled' })}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-danger/10 hover:border-danger/30 hover:text-danger text-text-secondary transition-all text-xs font-medium"
                        >
                          <Trash2 size={13} /> Delete forever
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* ── Confirm Empty Bin Modal ── */}
      {confirmEmpty && (
        <Modal
          title="Empty recycle bin?"
          onClose={() => setConfirmEmpty(false)}
          footer={
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmEmpty(false)}
                className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded-xl border border-bg-border hover:bg-bg-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyBin}
                disabled={emptyBin.isPending}
                className="px-4 py-2.5 text-sm font-semibold bg-danger hover:bg-red-600 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {emptyBin.isPending && <Spinner size={13} />}
                Empty bin permanently
              </button>
            </div>
          }
        >
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={16} className="text-danger" />
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              This will permanently delete all <strong className="text-text-primary">{total} {total === 1 ? 'item' : 'items'}</strong> in the bin. This cannot be undone.
            </p>
          </div>
        </Modal>
      )}

      {/* ── Confirm Purge Single Item Modal ── */}
      {confirmPurge && (
        <Modal
          title="Delete permanently?"
          onClose={() => setConfirmPurge(null)}
          footer={
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmPurge(null)}
                className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary rounded-xl border border-bg-border hover:bg-bg-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePurge}
                className="px-4 py-2.5 text-sm font-semibold bg-danger hover:bg-red-600 text-white rounded-xl transition-colors"
              >
                Delete forever
              </button>
            </div>
          }
        >
          <p className="text-text-secondary text-sm leading-relaxed">
            <strong className="text-text-primary">"{confirmPurge.name}"</strong> will be permanently deleted and cannot be recovered.
          </p>
        </Modal>
      )}
    </div>
  )
}
