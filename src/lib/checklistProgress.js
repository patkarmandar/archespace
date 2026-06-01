/**
 * checklistProgress.js - Progress summary for checklist items.
 */
export function getChecklistProgress(content) {
  const items = content?.items
  if (!Array.isArray(items) || items.length === 0) return null
  const done = items.filter(i => i.checked).length
  return { done, total: items.length }
}
