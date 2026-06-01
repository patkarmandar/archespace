/**
 * CollectionCard.jsx - Individual collection card for the dashboard grid.
 */
import { ChevronRight, Pin, PinOff, Pencil, Trash2, Copy, Archive, CheckSquare, Square } from 'lucide-react'
import { getColorPreset } from '../../lib/collectionColors'

export function CollectionCard({
  col, index, search, dragIndex, dragOverIndex,
  handleDragStart, handleDragOver, handleDrop, handleDragEnd,
  navigate, togglePin, setModal, setDeleteConfirm, onDuplicate, onArchive,
  stats,
  selectMode = false,
  selected = false,
  onToggleSelect,
}) {
  const colorPreset = getColorPreset(col.color)
  const itemStats = stats?.[col.id]
  const itemLabel = itemStats
    ? `${itemStats.total} ${itemStats.total === 1 ? 'item' : 'items'}${itemStats.pinned ? ` · ${itemStats.pinned} pinned` : ''}`
    : '0 items'

  return (
    <div
      draggable={!search && !selectMode}
      onDragStart={() => !selectMode && handleDragStart(index)}
      onDragOver={(e) => !selectMode && handleDragOver(e, index)}
      onDrop={() => !selectMode && handleDrop(index)}
      onDragEnd={handleDragEnd}
      onClick={() => (selectMode ? onToggleSelect?.() : navigate(`/collection/${col.id}`))}
      className={`group border rounded-2xl p-4 cursor-pointer hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up overflow-hidden ${
        selected ? 'ring-2 ring-accent border-accent bg-accent/5' :
        col.pinned ? 'bg-accent/5 border-accent hover:border-accent/80' : 'bg-bg-surface border-bg-border hover:border-accent/40'
      } ${
        !selectMode && dragOverIndex === index && dragIndex !== index ? 'border-l-4 border-l-accent pl-3' : ''
      } ${!selectMode && dragIndex === index ? 'opacity-40' : ''}`}
      style={{
        animationDelay: `${index * 50}ms`,
        borderTopWidth: colorPreset ? '3px' : undefined,
        borderTopColor: colorPreset?.value,
      }}
    >
      {selectMode && (
        <div className="mb-2 text-accent">
          {selected ? <CheckSquare size={16} /> : <Square size={16} className="text-text-muted" />}
        </div>
      )}
      {Array.isArray(col.tags) && col.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {col.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-bg-elevated text-text-muted border border-bg-border"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
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
        {!selectMode && (
          <ChevronRight size={16} className="text-text-muted shrink-0 mt-0.5 group-hover:text-accent transition-colors" />
        )}
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-bg-border gap-2">
        <p className="text-text-muted text-xs truncate">{itemLabel}</p>
        {!selectMode && (
          <div className="flex gap-1 flex-wrap justify-end" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => togglePin.mutate({ id: col.id, pinned: col.pinned })}
              className={`p-2 rounded-lg border transition-all ${
                col.pinned
                  ? 'border-accent/30 bg-accent-muted text-accent hover:bg-accent/20'
                  : 'border-bg-border bg-bg-surface text-text-secondary hover:text-accent hover:bg-accent-muted hover:border-accent/30'
              }`}
              title={col.pinned ? 'Unpin' : 'Pin'}
            >
              {col.pinned ? <PinOff size={12} /> : <Pin size={12} />}
            </button>
            <button
              type="button"
              onClick={() => onDuplicate?.(col.id)}
              className="p-2 rounded-lg border border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
              title="Duplicate"
            >
              <Copy size={12} />
            </button>
            <button
              type="button"
              onClick={() => onArchive?.(col.id)}
              className="p-2 rounded-lg border border-bg-border bg-bg-surface text-text-secondary hover:text-accent transition-all"
              title="Archive"
            >
              <Archive size={12} />
            </button>
            <button
              type="button"
              onClick={() => setModal({ type: 'edit', col })}
              className="p-2 rounded-lg border border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all"
              title="Edit"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirm(col.id)}
              className="p-2 rounded-lg border border-bg-border bg-bg-surface text-text-secondary hover:text-danger hover:bg-danger/10 hover:border-danger/30 transition-all"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
