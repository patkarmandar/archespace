/**
 * useSpaceStats.js - Item counts per space for dashboard cards.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/queryKeys'

export function useSpaceStats() {
  return useQuery({
    queryKey: queryKeys.spaceStats(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('space_items')
        .select('space_id, pinned')
        .is('deleted_at', null)
        .is('archived_at', null)
      if (error) throw error

      const stats = {}
      for (const row of data || []) {
        if (!stats[row.space_id]) {
          stats[row.space_id] = { total: 0, pinned: 0 }
        }
        stats[row.space_id].total++
        if (row.pinned) stats[row.space_id].pinned++
      }
      return stats
    },
    staleTime: 1000 * 30,
  })
}
