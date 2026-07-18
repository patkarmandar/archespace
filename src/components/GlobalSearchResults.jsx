import { Folder, FileText } from 'lucide-react'
import { TYPE_LABELS } from '../lib/itemTypes'
import { GLOBAL_SEARCH_RESULT_LIMIT } from '../lib/constants'

export default function GlobalSearchResults({
  search,
  globalMatches,
  itemMeta,
  onSelectSpace,
  truncated = false,
  className = '',
}) {
  const hasResults = globalMatches.spaces.length > 0 || globalMatches.items.length > 0

  return (
    <div className={className}>
      {!hasResults ? (
        <p className="text-sm text-text-muted py-2 px-1">No results for &ldquo;{search}&rdquo;</p>
      ) : (
        <>
          {globalMatches.spaces.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 px-1">Spaces</p>
              <ul className="space-y-1">
                {globalMatches.spaces.map(c => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onSelectSpace(c.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-bg-elevated text-left text-sm"
                    >
                      <Folder size={14} className="text-accent shrink-0" />
                      <span className="font-medium text-text-primary truncate">{c.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {globalMatches.items.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 px-1">Items</p>
              <ul className="space-y-1">
                {globalMatches.items.slice(0, 30).map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onSelectSpace(item.space_id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-bg-elevated text-left text-sm"
                    >
                      <FileText size={14} className="text-text-muted shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-primary truncate">{item.title || 'Untitled'}</p>
                        <p className="text-xs text-text-muted truncate">
                          {TYPE_LABELS[item.type]} · {itemMeta?.[item.id]?.spaceName}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {globalMatches.items.length > 30 && (
                <p className="text-xs text-text-muted mt-2 px-3">+{globalMatches.items.length - 30} more items</p>
              )}
            </section>
          )}
        </>
      )}
      {truncated && (
        <p className="text-[11px] text-text-muted mt-3 px-1 pt-2 border-t border-bg-border">
          Only your {GLOBAL_SEARCH_RESULT_LIMIT} most recent spaces and items are searched. Refine your search if something's missing.
        </p>
      )}
    </div>
  )
}
