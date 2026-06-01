/**
 * GlobalSearch.jsx - Search collections and item content (modal).
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Folder, FileText } from 'lucide-react'
import { Modal } from './ui/UI'
import { useGlobalSearchData } from '../hooks/useGlobalSearch'
import { filterGlobalSearch } from '../lib/search'

const TYPE_LABELS = {
  textbox: 'Note',
  checkbox_list: 'Checklist',
  menu_list: 'List',
  card_list: 'Cards',
}

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { data, isLoading } = useGlobalSearchData()

  const { collections, items } = useMemo(
    () => filterGlobalSearch({
      collections: data?.collections || [],
      items: data?.items || [],
      itemMeta: data?.itemMeta || {},
    }, query),
    [data, query]
  )

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  if (!open) return null

  const goCollection = (id) => {
    onClose()
    navigate(`/collection/${id}`)
  }

  return (
    <Modal title="Search everywhere" onClose={onClose}>
      <div className="relative mb-4 -mt-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Collections, notes, checklists…"
          className="w-full bg-bg-elevated border border-bg-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-text-muted py-4 text-center">Loading…</p>
      ) : !query.trim() ? (
        <p className="text-sm text-text-muted py-2">Type to search across all collections and items.</p>
      ) : collections.length === 0 && items.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">No results for &ldquo;{query}&rdquo;</p>
      ) : (
        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
          {collections.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Collections</p>
              <ul className="space-y-1">
                {collections.map(c => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => goCollection(c.id)}
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
          {items.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Items</p>
              <ul className="space-y-1">
                {items.slice(0, 30).map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => goCollection(item.collection_id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-bg-elevated text-left text-sm"
                    >
                      <FileText size={14} className="text-text-muted shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-primary truncate">{item.title || 'Untitled'}</p>
                        <p className="text-xs text-text-muted truncate">
                          {TYPE_LABELS[item.type]} · {data?.itemMeta?.[item.id]?.collectionName}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {items.length > 30 && (
                <p className="text-xs text-text-muted mt-2 px-3">+{items.length - 30} more items</p>
              )}
            </section>
          )}
        </div>
      )}
    </Modal>
  )
}
