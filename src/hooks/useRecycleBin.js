/**
 * useRecycleBin.js - Hook for managing soft-deleted items.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

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
            .is('archived_at', null)
            .order('deleted_at', { ascending: false }),
          supabase
            .from('collection_items')
            .select('*')
            .not('deleted_at', 'is', null)
            .is('archived_at', null)
            .order('deleted_at', { ascending: false }),
        ])
      if (e1) throw e1
      if (e2) throw e2
      return { collections: collections || [], items: items || [] }
    },
  })

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
      qc.invalidateQueries({ queryKey: ['items'] })
    },
  })

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

  const emptyBin = useMutation({
    mutationFn: async () => {
      const { error: e1 } = await supabase
        .from('collection_items')
        .delete()
        .not('deleted_at', 'is', null)
      if (e1) throw e1

      const { error: e2 } = await supabase
        .from('collections')
        .delete()
        .not('deleted_at', 'is', null)
      if (e2) throw e2
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bin'] }),
  })

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
