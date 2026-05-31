/**
 * useCollections.js — Hook for managing collections.
 *
 * Fetches all non-deleted collections for the current user.
 * Subscribes to Supabase Realtime for instant updates.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
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
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [qc])

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

  const update = useMutation({
    mutationFn: async ({ id, name, description }) => {
      const { data, error } = await supabase
        .from('collections')
        .update({ name, description })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
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
      // P1 Bugfix: N+1 update fixed using RPC bulk update
      const updates = orderedCollections.map((col, index) => ({
        id: col.id,
        position: index
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
    },
  })

  return { ...query, create, update, togglePin, remove, reorder }
}
