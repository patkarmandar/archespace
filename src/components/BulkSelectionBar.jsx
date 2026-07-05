/**
 * BulkSelectionBar.jsx - Floating toolbar for bulk actions on selected rows.
 */
import { X } from 'lucide-react'

/**
 * @param {{
 *   count: number,
 *   total: number,
 *   onClear: Function,
 *   onSelectAll: Function,
 *   actions: Array<{ id: string, label: string, icon: React.ComponentType, onClick: Function, variant?: 'danger' }>,
 * }} props
 */
export default function BulkSelectionBar({ count, total, onClear, onSelectAll, actions }) {
  if (count === 0) return null

  return (
    <div className="sticky bottom-4 z-30 mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-2xl border border-accent/30 bg-bg-surface shadow-2xl shadow-black/20 backdrop-blur-md">
        <span className="text-sm font-semibold text-text-primary tabular-nums shrink-0">
          {count} selected
        </span>
        {count < total && (
          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs text-accent hover:underline shrink-0"
          >
            Select all ({total})
          </button>
        )}
        <div className="flex-1 min-w-[8px]" />
        <div className="flex flex-wrap items-center gap-1.5">
          {actions.map(({ id, label, icon: Icon, onClick, variant }) => (
            <button
              key={id}
              type="button"
              onClick={onClick}
              title={label}
              className={`p-2 rounded-lg border text-sm transition-all ${
                variant === 'danger'
                  ? 'border-bg-border bg-bg-surface hover:bg-danger/10 hover:border-danger/30 hover:text-danger text-text-secondary'
                  : 'border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClear}
          title="Clear selection"
          className="p-2 rounded-lg border border-bg-border hover:bg-bg-elevated text-text-muted"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}

