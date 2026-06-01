/**
 * useCollectionStats.js - Item counts per collection for dashboard cards.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useCollectionStats() {
  return useQuery({
    queryKey: ['collection-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_items')
        .select('collection_id, pinned')
        .is('deleted_at', null)
        .is('archived_at', null)
      if (error) throw error

      const stats = {}
      for (const row of data || []) {
        if (!stats[row.collection_id]) {
          stats[row.collection_id] = { total: 0, pinned: 0 }
        }
        stats[row.collection_id].total++
        if (row.pinned) stats[row.collection_id].pinned++
      }
      return stats
    },
    staleTime: 1000 * 30,
  })
}
