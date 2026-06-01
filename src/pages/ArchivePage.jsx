/**
 * ArchivePage.jsx - Archived collections and items (reversible).
 */
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Archive, RotateCcw, Folder, LayoutList } from 'lucide-react'
import { useArchive } from '../hooks/useArchive'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/ui/UI'

const TYPE_LABELS = {
  textbox: 'Note', checkbox_list: 'Checklist', menu_list: 'List', card_list: 'Cards',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export default function ArchivePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data, isLoading, unarchiveCollection, unarchiveItem, total } = useArchive()

  const collections = data?.collections || []
  const items = data?.items || []

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="sticky top-0 z-20 glass">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-text-primary">Archive</h1>
            <p className="text-xs text-text-muted mt-0.5">
              {total} archived - hidden from dashboard, not deleted
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size={24} /></div>
        ) : total === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-bg-surface border border-bg-border flex items-center justify-center mx-auto mb-4">
              <Archive size={22} className="text-text-muted" />
            </div>
            <p className="text-text-secondary font-medium">Archive is empty</p>
            <p className="text-text-muted text-sm mt-1">Archive collections from the dashboard menu</p>
          </div>
        ) : (
          <div className="space-y-6">
            {collections.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Folder size={14} className="text-text-muted" />
                  <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Collections</h2>
                </div>
                <div className="space-y-2">
                  {collections.map(col => (
                    <div key={col.id} className="bg-bg-surface border border-bg-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{col.name}</p>
                        <p className="text-xs text-text-muted mt-1">Archived {timeAgo(col.archived_at)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => unarchiveCollection.mutate(col.id, {
                          onSuccess: () => toast.success('Collection restored from archive'),
                          onError: () => toast.error('Failed to restore'),
                        })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border hover:bg-success/10 hover:text-success text-text-secondary text-xs font-medium"
                      >
                        <RotateCcw size={13} /> Unarchive
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {items.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <LayoutList size={14} className="text-text-muted" />
                  <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Items</h2>
                </div>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="bg-bg-surface border border-bg-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-text-muted bg-bg-elevated px-2 py-0.5 rounded border border-bg-border">
                          {TYPE_LABELS[item.type]}
                        </span>
                        <p className="text-sm font-semibold text-text-primary truncate mt-1">{item.title || 'Untitled'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => unarchiveItem.mutate(item.id, {
                          onSuccess: () => toast.success('Item restored'),
                          onError: () => toast.error('Failed to restore'),
                        })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border hover:bg-success/10 hover:text-success text-text-secondary text-xs font-medium"
                      >
                        <RotateCcw size={13} /> Unarchive
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
