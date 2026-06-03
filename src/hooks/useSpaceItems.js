/**
 * useSpaceItems.js - Hook for items within a single space.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useEncryption } from '../context/EncryptionContext'
import { encryptItem, decryptItem, decryptItems } from '../lib/dataProtection'

const defaultContent = {
  textbox: { text: '' },
  checkbox_list: {
    items: [{ id: crypto.randomUUID(), text: '', checked: false }],
  },
  menu_list: { items: [] },
  card_list: { items: [] },
}

export function useSpaceItems(spaceId) {
  const qc = useQueryClient()
  const { cryptoKey } = useEncryption()

  const query = useQuery({
    queryKey: ['items', spaceId],
    enabled: !!spaceId && !!cryptoKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('space_items')
        .select('*')
        .eq('space_id', spaceId)
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('pinned', { ascending: false })
        .order('position', { ascending: true })
      if (error) throw error
      return decryptItems(data || [], cryptoKey)
    },
  })

  useEffect(() => {
    if (!spaceId) return
    const channel = supabase
      .channel(`items-${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'space_items',
          filter: `space_id=eq.${spaceId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['items', spaceId] })
          qc.invalidateQueries({ queryKey: ['bin'] })
          qc.invalidateQueries({ queryKey: ['archive'] })
          qc.invalidateQueries({ queryKey: ['space-stats'] })
          qc.invalidateQueries({ queryKey: ['global-search-data'] })
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [spaceId, qc])

  const create = useMutation({
    mutationFn: async ({ type, title, content }) => {
      const items = query.data || []
      const position = items.length
      const plain = {
        type,
        title: title || '',
        content: content ?? defaultContent[type] ?? {},
      }
      const encrypted = await encryptItem(plain, cryptoKey)

      const { data, error } = await supabase
        .from('space_items')
        .insert({
          space_id: spaceId,
          type: plain.type,
          title: encrypted.title,
          content: encrypted.content,
          position,
        })
        .select()
        .single()
      if (error) throw error
      return decryptItem(data, cryptoKey)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', spaceId] })
      qc.invalidateQueries({ queryKey: ['space-stats'] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, title, content }) => {
      const encrypted = await encryptItem({ title, content }, cryptoKey)
      const { data, error } = await supabase
        .from('space_items')
        .update({ title: encrypted.title, content: encrypted.content })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return decryptItem(data, cryptoKey)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', spaceId] }),
  })

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }) => {
      const { error } = await supabase
        .from('space_items')
        .update({ pinned: !pinned })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, pinned }) => {
      await qc.cancelQueries({ queryKey: ['items', spaceId] })
      const previous = qc.getQueryData(['items', spaceId])
      qc.setQueryData(['items', spaceId], (old) =>
        old?.map(item => item.id === id ? { ...item, pinned: !pinned } : item)
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['items', spaceId], context.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['items', spaceId] })
      qc.invalidateQueries({ queryKey: ['space-stats'] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('space_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', spaceId] })
      qc.invalidateQueries({ queryKey: ['bin'] })
      qc.invalidateQueries({ queryKey: ['space-stats'] })
    },
  })

  const archive = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('space_items')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', spaceId] })
      qc.invalidateQueries({ queryKey: ['archive'] })
      qc.invalidateQueries({ queryKey: ['space-stats'] })
    },
  })

  const duplicate = useMutation({
    mutationFn: async (item) => {
      const items = query.data || []
      const plain = {
        type: item.type,
        title: item.title ? `${item.title} (copy)` : 'Untitled (copy)',
        content: structuredClone(item.content),
      }
      const encrypted = await encryptItem(plain, cryptoKey)
      const { data, error } = await supabase
        .from('space_items')
        .insert({
          space_id: spaceId,
          type: plain.type,
          title: encrypted.title,
          content: encrypted.content,
          position: items.length,
          pinned: false,
        })
        .select()
        .single()
      if (error) throw error
      return decryptItem(data, cryptoKey)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', spaceId] })
      qc.invalidateQueries({ queryKey: ['space-stats'] })
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
      await qc.cancelQueries({ queryKey: ['items', spaceId] })
      const previous = qc.getQueryData(['items', spaceId])
      qc.setQueryData(['items', spaceId], orderedItems.map((item, i) => ({
        ...item, position: i,
      })))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['items', spaceId], context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', spaceId] }),
  })

  const invalidateItems = () => {
    qc.invalidateQueries({ queryKey: ['items', spaceId] })
    qc.invalidateQueries({ queryKey: ['bin'] })
    qc.invalidateQueries({ queryKey: ['archive'] })
    qc.invalidateQueries({ queryKey: ['space-stats'] })
    qc.invalidateQueries({ queryKey: ['global-search-data'] })
  }

  const bulkRemove = useMutation({
    mutationFn: async (ids) => {
      if (!ids?.length) return
      const { error } = await supabase
        .from('space_items')
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
        .from('space_items')
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
        .from('space_items')
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
      const rows = await Promise.all(
        itemsToCopy.map(async (item, i) => {
          const plain = {
            title: item.title ? `${item.title} (copy)` : 'Untitled (copy)',
            content: structuredClone(item.content),
          }
          const encrypted = await encryptItem(plain, cryptoKey)
          return {
            space_id: spaceId,
            type: item.type,
            title: encrypted.title,
            content: encrypted.content,
            position: basePos + i,
            pinned: false,
          }
        })
      )
      const { error } = await supabase.from('space_items').insert(rows)
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
