/**
 * useArchive.js - Archived collections and items (reversible, not deleted).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useArchive() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['archive'],
    queryFn: async () => {
      const [{ data: collections, error: e1 }, { data: items, error: e2 }] =
        await Promise.all([
          supabase
            .from('collections')
            .select('*')
            .not('archived_at', 'is', null)
            .is('deleted_at', null)
            .order('archived_at', { ascending: false }),
          supabase
            .from('collection_items')
            .select('*')
            .not('archived_at', 'is', null)
            .is('deleted_at', null)
            .order('archived_at', { ascending: false }),
        ])
      if (e1) throw e1
      if (e2) throw e2
      return { collections: collections || [], items: items || [] }
    },
  })

  const unarchiveCollection = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('collections')
        .update({ archived_at: null })
        .eq('id', id)
      if (error) throw error
      await supabase
        .from('collection_items')
        .update({ archived_at: null })
        .eq('collection_id', id)
        .not('archived_at', 'is', null)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['archive'] })
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['collection-stats'] })
    },
  })

  const unarchiveItem = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('collection_items')
        .update({ archived_at: null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['archive'] })
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['collection-stats'] })
    },
  })

  const total =
    (query.data?.collections?.length || 0) +
    (query.data?.items?.length || 0)

  return { ...query, unarchiveCollection, unarchiveItem, total }
}
