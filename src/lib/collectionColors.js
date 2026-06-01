/**
 * collectionColors.js - Preset accent colors for collections.
 */
export const COLLECTION_COLORS = [
  { id: 'violet', label: 'Violet', value: '#7c6af7', ring: 'ring-accent', dot: 'bg-accent' },
  { id: 'blue', label: 'Blue', value: '#60a5fa', ring: 'ring-blue-400', dot: 'bg-blue-400' },
  { id: 'green', label: 'Green', value: '#34d399', ring: 'ring-emerald-400', dot: 'bg-emerald-400' },
  { id: 'amber', label: 'Amber', value: '#fbbf24', ring: 'ring-amber-400', dot: 'bg-amber-400' },
  { id: 'rose', label: 'Rose', value: '#fb7185', ring: 'ring-rose-400', dot: 'bg-rose-400' },
  { id: 'slate', label: 'Slate', value: '#94a3b8', ring: 'ring-slate-400', dot: 'bg-slate-400' },
]

export function getColorPreset(id) {
  return COLLECTION_COLORS.find(c => c.id === id) || null
}

export function parseTags(raw) {
  if (Array.isArray(raw)) return raw.filter(t => typeof t === 'string').map(t => t.trim()).filter(Boolean)
  return []
}
