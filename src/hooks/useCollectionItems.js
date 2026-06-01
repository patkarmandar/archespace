/**
 * useCollectionItems.js - Hook for items within a single collection.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const defaultContent = {
  textbox: { text: '' },
  checkbox_list: {
    items: [{ id: crypto.randomUUID(), text: '', checked: false }],
  },
  menu_list: { items: [] },
  card_list: { items: [] },
}

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
        .is('archived_at', null)
        .order('pinned', { ascending: false })
        .order('position', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!collectionId,
  })

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
          qc.invalidateQueries({ queryKey: ['archive'] })
          qc.invalidateQueries({ queryKey: ['collection-stats'] })
          qc.invalidateQueries({ queryKey: ['global-search-data'] })
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [collectionId, qc])

  const create = useMutation({
    mutationFn: async ({ type, title, content }) => {
      const items = query.data || []
      const position = items.length

      const { data, error } = await supabase
        .from('collection_items')
        .insert({
          collection_id: collectionId,
          type,
          title: title || '',
          content: content ?? defaultContent[type] ?? {},
          position,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', collectionId] })
      qc.invalidateQueries({ queryKey: ['collection-stats'] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, title, content }) => {
      const { data, error } = await supabase
        .from('collection_items')
        .update({ title, content })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', collectionId] }),
  })

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
      if (context?.previous) qc.setQueryData(['items', collectionId], context.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['items', collectionId] })
      qc.invalidateQueries({ queryKey: ['collection-stats'] })
    },
  })

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
      qc.invalidateQueries({ queryKey: ['collection-stats'] })
    },
  })

  const archive = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('collection_items')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', collectionId] })
      qc.invalidateQueries({ queryKey: ['archive'] })
      qc.invalidateQueries({ queryKey: ['collection-stats'] })
    },
  })

  const duplicate = useMutation({
    mutationFn: async (item) => {
      const items = query.data || []
      const { data, error } = await supabase
        .from('collection_items')
        .insert({
          collection_id: collectionId,
          type: item.type,
          title: item.title ? `${item.title} (copy)` : 'Untitled (copy)',
          content: structuredClone(item.content),
          position: items.length,
          pinned: false,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', collectionId] })
      qc.invalidateQueries({ queryKey: ['collection-stats'] })
    },
  })

  const reorder = useMutation({
    mutationFn: async (orderedItems) => {
      const updates = orderedItems.map((item, index) => ({
        id: item.id,
        position: index,
      }))
      const { error } = await supabase.rpc('update_item_positions', { updates })
      if (error) throw error
    },
    onMutate: async (orderedItems) => {
      await qc.cancelQueries({ queryKey: ['items', collectionId] })
      const previous = qc.getQueryData(['items', collectionId])
      qc.setQueryData(['items', collectionId], orderedItems.map((item, i) => ({
        ...item, position: i,
      })))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['items', collectionId], context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', collectionId] }),
  })

  const invalidateItems = () => {
    qc.invalidateQueries({ queryKey: ['items', collectionId] })
    qc.invalidateQueries({ queryKey: ['bin'] })
    qc.invalidateQueries({ queryKey: ['archive'] })
    qc.invalidateQueries({ queryKey: ['collection-stats'] })
    qc.invalidateQueries({ queryKey: ['global-search-data'] })
  }

  const bulkRemove = useMutation({
    mutationFn: async (ids) => {
      if (!ids?.length) return
      const { error } = await supabase
        .from('collection_items')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: invalidateItems,
  })

  const bulkArchive = useMutation({
    mutationFn: async (ids) => {
      if (!ids?.length) return
      const { error } = await supabase
        .from('collection_items')
        .update({ archived_at: new Date().toISOString() })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: invalidateItems,
  })

  const bulkSetPinned = useMutation({
    mutationFn: async ({ ids, pinned }) => {
      if (!ids?.length) return
      const { error } = await supabase
        .from('collection_items')
        .update({ pinned })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: invalidateItems,
  })

  const bulkDuplicate = useMutation({
    mutationFn: async (itemsToCopy) => {
      if (!itemsToCopy?.length) return
      const basePos = query.data?.length || 0
      const rows = itemsToCopy.map((item, i) => ({
        collection_id: collectionId,
        type: item.type,
        title: item.title ? `${item.title} (copy)` : 'Untitled (copy)',
        content: structuredClone(item.content),
        position: basePos + i,
        pinned: false,
      }))
      const { error } = await supabase.from('collection_items').insert(rows)
      if (error) throw error
    },
    onSuccess: invalidateItems,
  })

  return {
    ...query,
    create,
    update,
    togglePin,
    remove,
    reorder,
    archive,
    duplicate,
    bulkRemove,
    bulkArchive,
    bulkSetPinned,
    bulkDuplicate,
  }
}
