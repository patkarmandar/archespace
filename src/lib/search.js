/**
 * search.js - Client-side global search helpers.
 */

function norm(s) {
  return (s || '').toLowerCase()
}

function itemSearchText(item) {
  const parts = [item.title]
  const c = item.content || {}
  if (item.type === 'textbox') parts.push(c.text)
  if (c.items && Array.isArray(c.items)) {
    for (const row of c.items) {
      parts.push(row.text, row.title, row.description)
    }
  }
  return norm(parts.filter(Boolean).join(' '))
}

/**
 * @returns {{ collections: Array, items: Array }}
 */
export function filterGlobalSearch({ collections, items, itemMeta }, query) {
  const q = norm(query.trim())
  if (!q) return { collections: [], items: [] }

  const matchedCollections = collections.filter(c =>
    norm(c.name).includes(q) || norm(c.description).includes(q) ||
    (Array.isArray(c.tags) && c.tags.some(t => norm(t).includes(q)))
  )

  const matchedItems = items.filter(item => {
    if (itemSearchText(item).includes(q)) return true
    const meta = itemMeta?.[item.id]
    if (meta && norm(meta.collectionName).includes(q)) return true
    return false
  })

  return { collections: matchedCollections, items: matchedItems }
}
