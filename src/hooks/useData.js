import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const now = () => new Date().toISOString()

// ─────────────────────────────────────────────
// Collections
// ─────────────────────────────────────────────
export function useCollections() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .is('deleted_at', null)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    const channel = supabase.channel(`collections-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, () => {
        qc.invalidateQueries({ queryKey: ['collections'] })
        qc.invalidateQueries({ queryKey: ['bin'] })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [qc])

  const create = useMutation({
    mutationFn: async ({ name, description }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('collections')
        .insert({ name, description, user_id: user.id })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

  const update = useMutation({
    mutationFn: async ({ id, name, description }) => {
      const { data, error } = await supabase
        .from('collections')
        .update({ name, description, updated_at: now() })
        .eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }) => {
      const { error } = await supabase
        .from('collections')
        .update({ pinned: !pinned, updated_at: now() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

  // Soft delete — moves to recycle bin
  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('collections')
        .update({ deleted_at: now() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['bin'] })
    },
  })

  return { ...query, create, update, togglePin, remove }
}

// ─────────────────────────────────────────────
// Collection Items
// ─────────────────────────────────────────────
export function useCollectionItems(collectionId) {
  const qc = useQueryClient()

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

  useEffect(() => {
    if (!collectionId) return
    const channel = supabase.channel(`items-${crypto.randomUUID()}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'collection_items',
        filter: `collection_id=eq.${collectionId}`
      }, () => {
        qc.invalidateQueries({ queryKey: ['items', collectionId] })
        qc.invalidateQueries({ queryKey: ['bin'] })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [collectionId, qc])

  const create = useMutation({
    mutationFn: async ({ type, title }) => {
      const items = query.data || []
      const position = items.length
      const defaultContent = {
        textbox:       { text: '' },
        checkbox_list: { items: [] },
        menu_list:     { items: [] },
        card_list:     { items: [] },
      }
      const { data, error } = await supabase
        .from('collection_items')
        .insert({ collection_id: collectionId, type, title: title || '', content: defaultContent[type], position })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', collectionId] }),
  })

  const update = useMutation({
    mutationFn: async ({ id, title, content }) => {
      const { data, error } = await supabase
        .from('collection_items')
        .update({ title, content, updated_at: now() })
        .eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', collectionId] }),
  })

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }) => {
      const { error } = await supabase
        .from('collection_items')
        .update({ pinned: !pinned, updated_at: now() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', collectionId] }),
  })

  // Soft delete — moves to recycle bin
  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('collection_items')
        .update({ deleted_at: now() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', collectionId] })
      qc.invalidateQueries({ queryKey: ['bin'] })
    },
  })

  return { ...query, create, update, togglePin, remove }
}

// ─────────────────────────────────────────────
// Recycle Bin
// ─────────────────────────────────────────────
export function useRecycleBin() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['bin'],
    queryFn: async () => {
      const [{ data: collections, error: e1 }, { data: items, error: e2 }] = await Promise.all([
        supabase.from('collections').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('collection_items').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
      ])
      if (e1) throw e1
      if (e2) throw e2
      return { collections: collections || [], items: items || [] }
    },
  })

  // Restore a collection
  const restoreCollection = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('collections').update({ deleted_at: null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collections'] }); qc.invalidateQueries({ queryKey: ['bin'] }) },
  })

  // Permanently delete a collection
  const purgeCollection = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('collections').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bin'] }),
  })

  // Restore an item
  const restoreItem = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('collection_items').update({ deleted_at: null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bin'] }); qc.invalidateQueries({ queryKey: ['items'] }) },
  })

  // Permanently delete an item
  const purgeItem = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('collection_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bin'] }),
  })

  // Empty entire bin
  const emptyBin = useMutation({
    mutationFn: async () => {
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('collections').delete().not('deleted_at', 'is', null),
        supabase.from('collection_items').delete().not('deleted_at', 'is', null),
      ])
      if (e1) throw e1
      if (e2) throw e2
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bin'] }),
  })

  const total = (query.data?.collections?.length || 0) + (query.data?.items?.length || 0)
  return { ...query, restoreCollection, purgeCollection, restoreItem, purgeItem, emptyBin, total }
}
