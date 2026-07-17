/**
 * useSpaces.js - Hook for managing spaces.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { parseTags } from '../lib/spaceColors'
import { useEncryption } from '../context/EncryptionCore'
import { encryptSpace, decryptSpace, decryptSpaces } from '../lib/dataProtection'
import { duplicateSpaceWithItems } from '../lib/spaceDuplicate'
import { invalidateSpaceCollections, invalidateSpaceList } from '../lib/queryInvalidation'

export function useSpaces() {
  const qc = useQueryClient()
  const { cryptoKey } = useEncryption()

  const query = useQuery({
    queryKey: ['spaces'],
    enabled: !!cryptoKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('pinned', { ascending: false })
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      return decryptSpaces(data || [], cryptoKey)
    },
  })

  useEffect(() => {
    // Coalesce bursts of row changes (e.g. a reorder updating many rows, or the
    // realtime echo of our own optimistic writes) into a single invalidation.
    let timer
    const channel = supabase
      .channel('spaces-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spaces' },
        () => {
          clearTimeout(timer)
          timer = setTimeout(() => invalidateSpaceCollections(qc), 250)
        }
      )
      .subscribe()
    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [qc])

  const create = useMutation({
    mutationFn: async ({ name, description, color, tags }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) throw new Error('Not authenticated')

      const position = query.data?.length || 0

      const encrypted = await encryptSpace({
        name,
        description: description || '',
        color: color || null,
        tags: parseTags(tags),
      }, cryptoKey)

      const { data, error } = await supabase
        .from('spaces')
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
      return decryptSpace(data, cryptoKey)
    },
    onSuccess: () => invalidateSpaceList(qc),
  })

  const update = useMutation({
    mutationFn: async ({ id, name, description, color, tags }) => {
      const payload = { name, description }
      if (color !== undefined) payload.color = color
      if (tags !== undefined) payload.tags = parseTags(tags)

      const encrypted = await encryptSpace(payload, cryptoKey)
      const dbPayload = { ...payload, name: encrypted.name, description: encrypted.description }
      if (tags !== undefined) dbPayload.tags = encrypted.tags

      const { data, error } = await supabase
        .from('spaces')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return decryptSpace(data, cryptoKey)
    },
    onSuccess: () => invalidateSpaceList(qc),
  })

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }) => {
      const { error } = await supabase
        .from('spaces')
        .update({ pinned: !pinned })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, pinned }) => {
      await qc.cancelQueries({ queryKey: ['spaces'] })
      const previous = qc.getQueryData(['spaces'])
      qc.setQueryData(['spaces'], (old) =>
        old?.map(c => c.id === id ? { ...c, pinned: !pinned } : c)
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['spaces'], context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['spaces'] }),
  })

  const reorder = useMutation({
    mutationFn: async (orderedSpaces) => {
      const updates = orderedSpaces.map((col, index) => ({
        id: col.id,
        position: index,
      }))
      const { error } = await supabase.rpc('update_space_positions', { updates })
      if (error) throw error
    },
    onMutate: async (orderedSpaces) => {
      await qc.cancelQueries({ queryKey: ['spaces'] })
      const previous = qc.getQueryData(['spaces'])
      qc.setQueryData(['spaces'], orderedSpaces.map((col, i) => ({
        ...col, position: i,
      })))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['spaces'], context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['spaces'] }),
  })

  const remove = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('spaces')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateSpaceCollections(qc),
  })

  const archive = useMutation({
    mutationFn: async (id) => {
      const now = new Date().toISOString()
      const { error: spaceError } = await supabase
        .from('spaces')
        .update({ archived_at: now })
        .eq('id', id)
      if (spaceError) throw spaceError
      const { error: itemError } = await supabase
        .from('space_items')
        .update({ archived_at: now })
        .eq('space_id', id)
        .is('deleted_at', null)
      if (itemError) throw itemError
    },
    onSuccess: () => invalidateSpaceCollections(qc),
  })

  const duplicate = useMutation({
    mutationFn: async (id) => {
      const source = query.data?.find(c => c.id === id)
      if (!source) throw new Error('Space not found')
      const newCol = await duplicateSpaceWithItems(source, cryptoKey, query.data?.length || 0)
      return decryptSpace(newCol, cryptoKey)
    },
    onSuccess: () => invalidateSpaceCollections(qc),
  })

  const bulkRemove = useMutation({
    mutationFn: async (ids) => {
      if (!ids?.length) return
      const { error } = await supabase
        .from('spaces')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => invalidateSpaceCollections(qc),
  })

  const bulkArchive = useMutation({
    mutationFn: async (ids) => {
      if (!ids?.length) return
      const now = new Date().toISOString()
      const { error: spaceError } = await supabase
        .from('spaces')
        .update({ archived_at: now })
        .in('id', ids)
      if (spaceError) throw spaceError

      const { error: itemError } = await supabase
        .from('space_items')
        .update({ archived_at: now })
        .in('space_id', ids)
        .is('deleted_at', null)
      if (itemError) throw itemError
    },
    onSuccess: () => invalidateSpaceCollections(qc),
  })

  const bulkSetPinned = useMutation({
    mutationFn: async ({ ids, pinned }) => {
      if (!ids?.length) return
      const { error } = await supabase
        .from('spaces')
        .update({ pinned })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => invalidateSpaceCollections(qc),
  })

  const bulkDuplicate = useMutation({
    mutationFn: async (cols) => {
      for (const source of cols) {
        await duplicateSpaceWithItems(source, cryptoKey, query.data?.length || 0)
      }
    },
    onSuccess: () => invalidateSpaceCollections(qc),
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
