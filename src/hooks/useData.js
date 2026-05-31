/**
 * useData.js — Data-access hooks for Arche.
 *
 * All Supabase queries and mutations live here so the UI layer
 * stays clean. Three main hooks are exported:
 *
 *   useCollections()          — CRUD + pin + soft-delete for collections
 *   useCollectionItems(id)    — CRUD + pin + soft-delete + reorder for items
 *   useRecycleBin()           — restore / purge / empty-bin for soft-deleted rows
 *
 * Additionally, two data-operation helpers are exported for use in
 * components that need export / import:
 *
 *   exportCollections(collections)  — download all active data as JSON
 *   importCollections(file, userId) — upload a JSON backup and insert rows
 *
 * Design decisions:
 *   - Realtime channels use deterministic names (not random UUIDs) so
 *     React strict-mode double-mounts don't leak duplicate channels.
 *   - Pin toggle uses optimistic cache updates for instant UI feedback.
 *   - The DB has an `updated_at` trigger, so we no longer pass
 *     `updated_at: now()` from the client — Postgres handles it.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'


// ─────────────────────────────────────────────────────────
// Collections
// ─────────────────────────────────────────────────────────

/**
 * Hook for the collections list.
 *
 * Fetches all non-deleted collections for the current user,
 * ordered by pinned-first then newest-first. Subscribes to
 * Supabase Realtime so the list refreshes automatically when
 * another tab or device makes a change.
 *
 * Returned mutations: create, update, togglePin, remove
 */
export function useCollections() {
  const qc = useQueryClient()

  // ── Query ──
  const query = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .is('deleted_at', null)           // exclude soft-deleted
        .order('pinned', { ascending: false })
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  // ── Realtime subscription ──
  // Deterministic channel name prevents duplicate subscriptions
  // during React strict-mode double-mount.
  useEffect(() => {
    const channel = supabase
      .channel('collections-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collections' },
        () => {
          qc.invalidateQueries({ queryKey: ['collections'] })
          qc.invalidateQueries({ queryKey: ['bin'] })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [qc])

  // ── Create ──
  // Reads user from the cached session to avoid an extra network call.
  const create = useMutation({
    mutationFn: async ({ name, description }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) throw new Error('Not authenticated')

      const position = query.data?.length || 0

      const { data, error } = await supabase
        .from('collections')
        .insert({ name, description, user_id: userId, position })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

  // ── Update ──
  const update = useMutation({
    mutationFn: async ({ id, name, description }) => {
      const { data, error } = await supabase
        .from('collections')
        .update({ name, description })  // updated_at handled by DB trigger
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

  // ── Toggle Pin (optimistic) ──
  // Updates the cache immediately so the user sees the pin/unpin
  // without waiting for the network round-trip. Rolls back on error.
  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }) => {
      const { error } = await supabase
        .from('collections')
        .update({ pinned: !pinned })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, pinned }) => {
      // Cancel in-flight queries so they don't overwrite our optimistic data
      await qc.cancelQueries({ queryKey: ['collections'] })

      // Snapshot the current cache for rollback
      const previous = qc.getQueryData(['collections'])

      // Optimistically toggle the pinned flag in the cache
      qc.setQueryData(['collections'], (old) =>
        old?.map(c => c.id === id ? { ...c, pinned: !pinned } : c)
      )

      return { previous }
    },
    onError: (_err, _vars, context) => {
      // Rollback to the snapshot on failure
      if (context?.previous) {
        qc.setQueryData(['collections'], context.previous)
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

  // ── Reorder (drag-and-drop) ──
  const reorder = useMutation({
    mutationFn: async (orderedCollections) => {
      const updates = orderedCollections.map((col, index) =>
        supabase
          .from('collections')
          .update({ position: index })
          .eq('id', col.id)
      )
      const results = await Promise.all(updates)
      const failed = results.find(r => r.error)
      if (failed) throw failed.error
    },
    onMutate: async (orderedCollections) => {
      await qc.cancelQueries({ queryKey: ['collections'] })
      const previous = qc.getQueryData(['collections'])

      qc.setQueryData(['collections'], orderedCollections.map((col, i) => ({
        ...col, position: i,
      })))

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['collections'], context.previous)
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

  // ── Soft-delete (move to recycle bin) ──
  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('collections')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['bin'] })
    },
  })

  return { ...query, create, update, togglePin, remove, reorder }
}


// ─────────────────────────────────────────────────────────
// Collection Items
// ─────────────────────────────────────────────────────────

/**
 * Hook for items within a single collection.
 *
 * @param {string} collectionId — UUID of the parent collection
 *
 * Fetches all non-deleted items ordered by pinned-first then
 * position ascending. Subscribes to Realtime filtered to just
 * this collection's items.
 *
 * Returned mutations: create, update, togglePin, remove, reorder
 */
export function useCollectionItems(collectionId) {
  const qc = useQueryClient()

  // ── Query ──
  const query = useQuery({
    queryKey: ['items', collectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_items')
        .select('*')
        .eq('collection_id', collectionId)
        .is('deleted_at', null)
        .order('pinned', { ascending: false })
        .order('position', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!collectionId,
  })

  // ── Realtime subscription (scoped to this collection) ──
  useEffect(() => {
    if (!collectionId) return

    const channel = supabase
      .channel(`items-${collectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collection_items',
          filter: `collection_id=eq.${collectionId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['items', collectionId] })
          qc.invalidateQueries({ queryKey: ['bin'] })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [collectionId, qc])

  // ── Create ──
  // Sets position to the end of the current list and initialises
  // content with the correct default shape for the item type.
  const create = useMutation({
    mutationFn: async ({ type, title }) => {
      const items = query.data || []
      const position = items.length

      /** Default content shape per item type */
      const defaultContent = {
        textbox:       { text: '' },
        checkbox_list: { items: [] },
        menu_list:     { items: [] },
        card_list:     { items: [] },
      }

      const { data, error } = await supabase
        .from('collection_items')
        .insert({
          collection_id: collectionId,
          type,
          title: title || '',
          content: defaultContent[type],
          position,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', collectionId] }),
  })

  // ── Update ──
  const update = useMutation({
    mutationFn: async ({ id, title, content }) => {
      const { data, error } = await supabase
        .from('collection_items')
        .update({ title, content })       // updated_at handled by DB trigger
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', collectionId] }),
  })

  // ── Toggle Pin (optimistic) ──
  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }) => {
      const { error } = await supabase
        .from('collection_items')
        .update({ pinned: !pinned })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, pinned }) => {
      await qc.cancelQueries({ queryKey: ['items', collectionId] })
      const previous = qc.getQueryData(['items', collectionId])

      qc.setQueryData(['items', collectionId], (old) =>
        old?.map(item => item.id === id ? { ...item, pinned: !pinned } : item)
      )

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['items', collectionId], context.previous)
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', collectionId] }),
  })

  // ── Soft-delete ──
  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('collection_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', collectionId] })
      qc.invalidateQueries({ queryKey: ['bin'] })
    },
  })

  // ── Reorder (drag-and-drop) ──
  // Accepts the full reordered array and batch-updates positions.
  const reorder = useMutation({
    mutationFn: async (orderedItems) => {
      // Update each item's position in parallel
      const updates = orderedItems.map((item, index) =>
        supabase
          .from('collection_items')
          .update({ position: index })
          .eq('id', item.id)
      )
      const results = await Promise.all(updates)
      const failed = results.find(r => r.error)
      if (failed) throw failed.error
    },
    // Optimistically update the cache with the new order
    onMutate: async (orderedItems) => {
      await qc.cancelQueries({ queryKey: ['items', collectionId] })
      const previous = qc.getQueryData(['items', collectionId])

      qc.setQueryData(['items', collectionId], orderedItems.map((item, i) => ({
        ...item, position: i,
      })))

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['items', collectionId], context.previous)
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', collectionId] }),
  })

  return { ...query, create, update, togglePin, remove, reorder }
}


// ─────────────────────────────────────────────────────────
// Recycle Bin
// ─────────────────────────────────────────────────────────

/**
 * Hook for the recycle bin page.
 *
 * Fetches all soft-deleted collections and items, ordered by
 * deletion date (newest first).
 *
 * Mutations: restoreCollection, purgeCollection, restoreItem,
 *            purgeItem, emptyBin
 */
export function useRecycleBin() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['bin'],
    queryFn: async () => {
      const [{ data: collections, error: e1 }, { data: items, error: e2 }] =
        await Promise.all([
          supabase
            .from('collections')
            .select('*')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false }),
          supabase
            .from('collection_items')
            .select('*')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false }),
        ])
      if (e1) throw e1
      if (e2) throw e2
      return { collections: collections || [], items: items || [] }
    },
  })

  // ── Restore a collection ──
  const restoreCollection = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('collections')
        .update({ deleted_at: null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['bin'] })
    },
  })

  // ── Permanently delete a collection ──
  const purgeCollection = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bin'] }),
  })

  // ── Restore an item ──
  const restoreItem = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('collection_items')
        .update({ deleted_at: null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bin'] })
      // Invalidate ALL item queries since we don't know which collection
      // this item belongs to from the bin context.
      qc.invalidateQueries({ queryKey: ['items'] })
    },
  })

  // ── Permanently delete an item ──
  const purgeItem = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('collection_items')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bin'] }),
  })

  // ── Empty the entire bin ──
  // Deletes items FIRST, then collections. This avoids a race
  // condition where cascade-deleting a collection removes its
  // items before the parallel item-delete query runs, causing
  // the item query to fail on "not found" rows.
  const emptyBin = useMutation({
    mutationFn: async () => {
      // Step 1: purge all soft-deleted items
      const { error: e1 } = await supabase
        .from('collection_items')
        .delete()
        .not('deleted_at', 'is', null)
      if (e1) throw e1

      // Step 2: purge all soft-deleted collections (cascade is now a no-op)
      const { error: e2 } = await supabase
        .from('collections')
        .delete()
        .not('deleted_at', 'is', null)
      if (e2) throw e2
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bin'] }),
  })

  /** Total number of items in the bin (collections + items) */
  const total =
    (query.data?.collections?.length || 0) +
    (query.data?.items?.length || 0)

  return {
    ...query,
    restoreCollection,
    purgeCollection,
    restoreItem,
    purgeItem,
    emptyBin,
    total,
  }
}


// ─────────────────────────────────────────────────────────
// Export / Import helpers
// ─────────────────────────────────────────────────────────

/**
 * Export all active collections (and their non-deleted items)
 * as a JSON file download.
 *
 * @param {Array} collections — The current collections array from useCollections
 */
export async function exportCollections(collections) {
  const allData = await Promise.all(
    collections.map(async (c) => {
      const { data } = await supabase
        .from('collection_items')
        .select('*')
        .eq('collection_id', c.id)
        .is('deleted_at', null)   // exclude soft-deleted items
        .order('position')
      return { ...c, items: data || [] }
    })
  )

  const blob = new Blob([JSON.stringify(allData, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = `arche-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Import collections from a JSON backup file.
 *
 * Each collection in the array is inserted as a new row (with a
 * fresh UUID), and its items are re-parented to the new collection.
 *
 * @param {File}   file   — The .json File object from an <input>
 * @param {string} userId — The authenticated user's UUID
 * @throws {Error} If the JSON is malformed or a Supabase insert fails
 */
export async function importCollections(file, userId) {
  const text   = await file.text()
  const parsed = JSON.parse(text) // may throw on malformed JSON

  // SECURITY: Validate imported data structure
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid backup format: Expected an array of collections.')
  }

  for (const col of parsed) {
    if (typeof col !== 'object' || col === null) {
      throw new Error('Invalid backup format: Collection must be an object.')
    }

    // Strip server-generated fields so Supabase creates fresh ones
    const { items, id, created_at, updated_at, user_id, deleted_at, pinned, ...colData } = col

    // Ensure name exists and sanitize length (matches DB constraints)
    if (!colData.name || typeof colData.name !== 'string') {
      colData.name = 'Imported Collection'
    }
    colData.name = colData.name.slice(0, 255)

    if (colData.description && typeof colData.description === 'string') {
      colData.description = colData.description.slice(0, 2000)
    }

    const { data: newCol, error: colErr } = await supabase
      .from('collections')
      .insert({ ...colData, user_id: userId })
      .select()
      .single()

    if (colErr) throw colErr

    if (newCol && Array.isArray(items) && items.length > 0) {
      // Re-parent items to the newly created collection
      const itemsToInsert = items.map(
        ({ id, collection_id, created_at, updated_at, deleted_at, ...item }) => {
          // Sanitize item title length
          if (item.title && typeof item.title === 'string') {
            item.title = item.title.slice(0, 255)
          }
          return {
            ...item,
            collection_id: newCol.id,
          }
        }
      )
      
      const { error: itemErr } = await supabase
        .from('collection_items')
        .insert(itemsToInsert)
      if (itemErr) throw itemErr
    }
  }
}
