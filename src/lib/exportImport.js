/**
 * exportImport.js — Data export and import utilities for Arche.
 *
 * Provides functions to export active collections as a JSON file,
 * and to import a JSON backup file with deep validation.
 */

import { supabase } from './supabase'
import {
  MAX_IMPORT_FILE_SIZE,
  MAX_IMPORT_COLLECTIONS,
  MAX_IMPORT_ITEMS_PER_COLLECTION,
  ITEM_TYPES,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH
} from './constants'

/**
 * Export all active collections (and their non-deleted items)
 * as a JSON file download.
 *
 * @param {Array} collections — The current collections array
 */
export async function exportCollections(collections) {
  try {
    const allData = await Promise.all(
      collections.map(async (c) => {
        const { data, error } = await supabase
          .from('collection_items')
          .select('*')
          .eq('collection_id', c.id)
          .is('deleted_at', null)
          .order('position')
        
        if (error) throw error
        return { ...c, items: data || [] }
      })
    )

    const blob = new Blob([JSON.stringify(allData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arche-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)

    // Log export action
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await supabase.from('audit_log').insert({
        user_id: session.user.id,
        action: 'export',
        entity_type: 'collections',
        details: { count: collections.length }
      })
    }
  } catch (error) {
    console.error('Export failed:', error)
    throw error
  }
}

/**
 * Validates the shape of item content based on its type.
 */
function validateItemContent(type, content) {
  if (!content || typeof content !== 'object') return false

  switch (type) {
    case 'textbox':
      return typeof content.text === 'string'
    case 'checkbox_list':
    case 'menu_list':
    case 'card_list':
      if (!Array.isArray(content.items)) return false
      // Basic check for reasonable size to prevent massive arrays
      if (content.items.length > 1000) return false
      return true
    default:
      return false
  }
}

/**
 * Import collections from a JSON backup file.
 *
 * @param {File} file — The .json File object from an <input>
 * @param {string} userId — The authenticated user's UUID
 * @throws {Error} If the JSON is malformed or invalid
 */
export async function importCollections(file, userId) {
  // Validate file size
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    throw new Error(`File is too large. Maximum size is ${MAX_IMPORT_FILE_SIZE / (1024 * 1024)}MB.`)
  }

  const text = await file.text()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    throw new Error('Invalid backup format: Not valid JSON.')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid backup format: Expected an array of collections.')
  }

  if (parsed.length > MAX_IMPORT_COLLECTIONS) {
    throw new Error(`Too many collections. Maximum allowed is ${MAX_IMPORT_COLLECTIONS}.`)
  }

  let totalItemsImported = 0

  for (const col of parsed) {
    if (typeof col !== 'object' || col === null) {
      throw new Error('Invalid backup format: Collection must be an object.')
    }

    const { items, id, created_at, updated_at, user_id, deleted_at, pinned, position, ...colData } = col

    // Validate and sanitize collection data
    let sanitizedName = typeof colData.name === 'string' ? colData.name.trim() : 'Imported Collection'
    if (!sanitizedName) sanitizedName = 'Imported Collection'
    colData.name = sanitizedName.slice(0, MAX_NAME_LENGTH)

    if (typeof colData.description === 'string') {
      colData.description = colData.description.trim().slice(0, MAX_DESCRIPTION_LENGTH)
    } else {
      colData.description = ''
    }

    const { data: newCol, error: colErr } = await supabase
      .from('collections')
      .insert({ ...colData, user_id: userId })
      .select()
      .single()

    if (colErr) throw colErr

    if (Array.isArray(items) && items.length > 0) {
      if (items.length > MAX_IMPORT_ITEMS_PER_COLLECTION) {
        throw new Error(`Too many items in collection "${colData.name}". Maximum allowed is ${MAX_IMPORT_ITEMS_PER_COLLECTION}.`)
      }

      const itemsToInsert = []
      for (const item of items) {
        // Validate type
        if (!ITEM_TYPES.includes(item.type)) continue

        // Validate content shape
        if (!validateItemContent(item.type, item.content)) continue

        // Sanitize title
        let sanitizedTitle = typeof item.title === 'string' ? item.title.trim() : ''
        sanitizedTitle = sanitizedTitle.slice(0, MAX_TITLE_LENGTH)

        itemsToInsert.push({
          collection_id: newCol.id,
          user_id: userId,
          type: item.type,
          title: sanitizedTitle,
          content: item.content,
          position: typeof item.position === 'number' ? item.position : itemsToInsert.length,
          pinned: !!item.pinned
        })
      }
      
      if (itemsToInsert.length > 0) {
        // Batch insert items
        const { error: itemErr } = await supabase
          .from('collection_items')
          .insert(itemsToInsert)
        if (itemErr) throw itemErr
        totalItemsImported += itemsToInsert.length
      }
    }
  }

  // Log import action
  await supabase.from('audit_log').insert({
    user_id: userId,
    action: 'import',
    entity_type: 'collections',
    details: { collections_count: parsed.length, items_count: totalItemsImported }
  })
}
