/**
 * exportCollection.js - Export a single collection as Markdown or JSON.
 */
import JSZip from 'jszip'
import { supabase } from './supabase'
import { decryptItems } from './dataProtection'

function itemToMarkdown(item) {
  const title = item.title || 'Untitled'
  let body = ''
  const c = item.content || {}

  switch (item.type) {
    case 'textbox':
      body = c.text || ''
      break
    case 'checkbox_list':
      body = (c.items || [])
        .map(i => `- [${i.checked ? 'x' : ' '}] ${i.text || ''}`)
        .join('\n')
      break
    case 'menu_list':
      body = (c.items || []).map(i => `- ${i.text || ''}`).join('\n')
      break
    case 'card_list':
      body = (c.items || [])
        .map(i => `### ${i.title || 'Card'}\n${i.description || ''}`)
        .join('\n\n')
      break
    default:
      body = JSON.stringify(c, null, 2)
  }

  return `## ${title}\n\n*Type: ${item.type}*\n\n${body}\n`
}

/**
 * Build markdown document for one collection.
 */
export function collectionToMarkdown(collection, items) {
  const header = `# ${collection.name}\n\n${collection.description ? `${collection.description}\n\n` : ''}---\n\n`
  const sections = (items || []).map(itemToMarkdown).join('\n---\n\n')
  return header + sections
}

/**
 * Download collection as a .md file.
 */
export function downloadCollectionMarkdown(collection, items) {
  const md = collectionToMarkdown(collection, items)
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(collection.name)}.md`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Download collection as a zip with index.md + items/*.md
 */
export async function downloadCollectionZip(collection, items) {
  const zip = new JSZip()
  zip.file('README.md', collectionToMarkdown(collection, items))
  ;(items || []).forEach((item, i) => {
    const name = `${String(i + 1).padStart(2, '0')}-${sanitizeFilename(item.title || item.type)}.md`
    zip.file(`items/${name}`, itemToMarkdown(item))
  })
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(collection.name)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCollectionJson(collection, items) {
  const blob = new Blob([JSON.stringify({ ...collection, items }, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(collection.name)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Fetch and decrypt items for export */
export async function fetchCollectionForExport(collectionId, cryptoKey) {
  if (!cryptoKey) throw new Error('Vault must be unlocked to export')
  const { data: items, error } = await supabase
    .from('collection_items')
    .select('*')
    .eq('collection_id', collectionId)
    .is('deleted_at', null)
    .is('archived_at', null)
    .order('position')
  if (error) throw error
  return decryptItems(items || [], cryptoKey)
}

function sanitizeFilename(name) {
  return (name || 'collection').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'collection'
}
