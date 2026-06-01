/**
 * useGlobalSearch.js - Loads data for cross-collection search.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useGlobalSearchData() {
  return useQuery({
    queryKey: ['global-search-data'],
    queryFn: async () => {
      const [{ data: collections, error: e1 }, { data: items, error: e2 }] = await Promise.all([
        supabase
          .from('collections')
          .select('id, name, description, tags, color, pinned')
          .is('deleted_at', null)
          .is('archived_at', null),
        supabase
          .from('collection_items')
          .select('id, collection_id, type, title, content, pinned')
          .is('deleted_at', null)
          .is('archived_at', null),
      ])
      if (e1) throw e1
      if (e2) throw e2

      const colMap = Object.fromEntries((collections || []).map(c => [c.id, c.name]))
      const itemMeta = Object.fromEntries(
        (items || []).map(i => [i.id, { collectionName: colMap[i.collection_id] || 'Unknown' }])
      )

      return {
        collections: collections || [],
        items: items || [],
        itemMeta,
      }
    },
    staleTime: 1000 * 60,
  })
}
