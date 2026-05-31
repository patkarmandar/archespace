/**
 * CollectionCard.jsx — Individual collection card for the dashboard grid.
 */
import { ChevronRight, Pin, PinOff, Pencil, Trash2 } from 'lucide-react'

export function CollectionCard({ 
  col, index, search, dragIndex, dragOverIndex, 
  handleDragStart, handleDragOver, handleDrop, handleDragEnd,
  navigate, togglePin, setModal, setDeleteConfirm
}) {
  return (
    <div
      draggable={!search}
      onDragStart={() => handleDragStart(index)}
      onDragOver={(e) => handleDragOver(e, index)}
      onDrop={() => handleDrop(index)}
      onDragEnd={handleDragEnd}
      onClick={() => navigate(`/collection/${col.id}`)}
      className={`group border rounded-2xl p-4 cursor-pointer hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up ${
        col.pinned ? 'bg-accent/5 border-accent hover:border-accent/80' : 'bg-bg-surface border-bg-border hover:border-accent/40'
      } ${
        dragOverIndex === index && dragIndex !== index
          ? 'border-l-4 border-l-accent pl-3'
          : ''
      } ${dragIndex === index ? 'opacity-40' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
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
  )
}
