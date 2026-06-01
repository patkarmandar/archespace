/**
 * useCollections.js - Hook for managing collections.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { parseTags } from '../lib/collectionColors'
import { useEncryption } from '../context/EncryptionContext'
import { encryptCollection, decryptCollection, decryptCollections } from '../lib/dataProtection'

export function useCollections() {
  const qc = useQueryClient()
  const { cryptoKey } = useEncryption()

  const query = useQuery({
    queryKey: ['collections'],
    enabled: !!cryptoKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('pinned', { ascending: false })
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      return decryptCollections(data || [], cryptoKey)
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel('collections-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collections' },
        () => {
          qc.invalidateQueries({ queryKey: ['collections'] })
          qc.invalidateQueries({ queryKey: ['bin'] })
          qc.invalidateQueries({ queryKey: ['archive'] })
          qc.invalidateQueries({ queryKey: ['collection-stats'] })
          qc.invalidateQueries({ queryKey: ['global-search-data'] })
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [qc])

  const create = useMutation({
    mutationFn: async ({ name, description, color, tags }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) throw new Error('Not authenticated')

      const position = query.data?.length || 0

      const encrypted = await encryptCollection({
        name,
        description: description || '',
        color: color || null,
        tags: parseTags(tags),
      }, cryptoKey)

      const { data, error } = await supabase
        .from('collections')
        .insert({
          name: encrypted.name,
          description: encrypted.description,
          user_id: userId,
          position,
          color: color || null,
          tags: encrypted.tags,
        })
        .select()
        .single()
      if (error) throw error
      return decryptCollection(data, cryptoKey)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

  const update = useMutation({
    mutationFn: async ({ id, name, description, color, tags }) => {
      const payload = { name, description }
      if (color !== undefined) payload.color = color
      if (tags !== undefined) payload.tags = parseTags(tags)

      const encrypted = await encryptCollection(payload, cryptoKey)
      const dbPayload = { ...payload, name: encrypted.name, description: encrypted.description }
      if (tags !== undefined) dbPayload.tags = encrypted.tags

      const { data, error } = await supabase
        .from('collections')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return decryptCollection(data, cryptoKey)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['global-search-data'] })
    },
  })

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }) => {
      const { error } = await supabase
        .from('collections')
        .update({ pinned: !pinned })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, pinned }) => {
      await qc.cancelQueries({ queryKey: ['collections'] })
      const previous = qc.getQueryData(['collections'])
      qc.setQueryData(['collections'], (old) =>
        old?.map(c => c.id === id ? { ...c, pinned: !pinned } : c)
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['collections'], context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

  const reorder = useMutation({
    mutationFn: async (orderedCollections) => {
      const updates = orderedCollections.map((col, index) => ({
        id: col.id,
        position: index,
      }))
      const { error } = await supabase.rpc('update_collection_positions', { updates })
      if (error) throw error
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
      if (context?.previous) qc.setQueryData(['collections'], context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })

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
      qc.invalidateQueries({ queryKey: ['collection-stats'] })
    },
  })

  const archive = useMutation({
    mutationFn: async (id) => {
      const now = new Date().toISOString()
      const { error: e1 } = await supabase
        .from('collections')
        .update({ archived_at: now })
        .eq('id', id)
      if (e1) throw e1
      await supabase
        .from('collection_items')
        .update({ archived_at: now })
        .eq('collection_id', id)
        .is('deleted_at', null)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['archive'] })
      qc.invalidateQueries({ queryKey: ['collection-stats'] })
      qc.invalidateQueries({ queryKey: ['items'] })
    },
  })

  const duplicate = useMutation({
    mutationFn: async (id) => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) throw new Error('Not authenticated')

      const source = query.data?.find(c => c.id === id)
      if (!source) throw new Error('Collection not found')

      const encCol = await encryptCollection({
        name: `${source.name} (copy)`,
        description: source.description || '',
        tags: source.tags || [],
      }, cryptoKey)

      const { data: newCol, error: colErr } = await supabase
        .from('collections')
        .insert({
          name: encCol.name,
          description: encCol.description,
          user_id: userId,
          position: (query.data?.length || 0),
          color: source.color,
          tags: encCol.tags,
          pinned: false,
        })
        .select()
        .single()
      if (colErr) throw colErr

      const { data: items, error: itemsErr } = await supabase
        .from('collection_items')
        .select('type, title, content, position, pinned')
        .eq('collection_id', id)
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('position')
      if (itemsErr) throw itemsErr

      if (items?.length) {
        const { error: insertErr } = await supabase.from('collection_items').insert(
          items.map((item, i) => ({
            collection_id: newCol.id,
            user_id: userId,
            type: item.type,
            title: item.title,
            content: item.content,
            position: i,
            pinned: item.pinned,
          }))
        )
        if (insertErr) throw insertErr
      }

      return decryptCollection(newCol, cryptoKey)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['collection-stats'] })
    },
  })

  const invalidateCollections = () => {
    qc.invalidateQueries({ queryKey: ['collections'] })
    qc.invalidateQueries({ queryKey: ['bin'] })
    qc.invalidateQueries({ queryKey: ['archive'] })
    qc.invalidateQueries({ queryKey: ['collection-stats'] })
    qc.invalidateQueries({ queryKey: ['global-search-data'] })
    qc.invalidateQueries({ queryKey: ['items'] })
  }

  const bulkRemove = useMutation({
    mutationFn: async (ids) => {
      if (!ids?.length) return
      const { error } = await supabase
        .from('collections')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: invalidateCollections,
  })

  const bulkArchive = useMutation({
    mutationFn: async (ids) => {
      if (!ids?.length) return
      const now = new Date().toISOString()
      for (const colId of ids) {
        const { error: e1 } = await supabase
          .from('collections')
          .update({ archived_at: now })
          .eq('id', colId)
        if (e1) throw e1
        await supabase
          .from('collection_items')
          .update({ archived_at: now })
          .eq('collection_id', colId)
          .is('deleted_at', null)
      }
    },
    onSuccess: invalidateCollections,
  })

  const bulkSetPinned = useMutation({
    mutationFn: async ({ ids, pinned }) => {
      if (!ids?.length) return
      const { error } = await supabase
        .from('collections')
        .update({ pinned })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: invalidateCollections,
  })

  const bulkDuplicate = useMutation({
    mutationFn: async (cols) => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) throw new Error('Not authenticated')

      for (const source of cols) {
        const encCol = await encryptCollection({
          name: `${source.name} (copy)`,
          description: source.description || '',
          tags: source.tags || [],
        }, cryptoKey)

        const { data: newCol, error: colErr } = await supabase
          .from('collections')
          .insert({
            name: encCol.name,
            description: encCol.description,
            user_id: userId,
            position: (query.data?.length || 0),
            color: source.color,
            tags: encCol.tags,
            pinned: false,
          })
          .select()
          .single()
        if (colErr) throw colErr

        const { data: items, error: itemsErr } = await supabase
          .from('collection_items')
          .select('type, title, content, position, pinned')
          .eq('collection_id', source.id)
          .is('deleted_at', null)
          .is('archived_at', null)
          .order('position')
        if (itemsErr) throw itemsErr

        if (items?.length) {
          const { error: insertErr } = await supabase.from('collection_items').insert(
            items.map((item, i) => ({
              collection_id: newCol.id,
              user_id: userId,
              type: item.type,
              title: item.title,
              content: item.content,
              position: i,
              pinned: item.pinned,
            }))
          )
          if (insertErr) throw insertErr
        }
      }
    },
    onSuccess: invalidateCollections,
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
