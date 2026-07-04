/**
 * useGlobalSearch.js - Loads data for cross-space search.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useEncryption } from '../context/EncryptionContext'
import { decryptSpaces, decryptItems } from '../lib/dataProtection'
import { GLOBAL_SEARCH_RESULT_LIMIT } from '../lib/constants'

export function useGlobalSearchData() {
  const { cryptoKey } = useEncryption()

  return useQuery({
    queryKey: ['global-search-data'],
    enabled: !!cryptoKey,
    queryFn: async () => {
      const [{ data: spaces, error: e1 }, { data: items, error: e2 }] = await Promise.all([
        supabase
          .from('spaces')
          .select('id, name, description, tags, color, pinned')
          .is('deleted_at', null)
          .is('archived_at', null)
          .order('updated_at', { ascending: false })
          .limit(GLOBAL_SEARCH_RESULT_LIMIT),
        supabase
          .from('space_items')
          .select('id, space_id, type, title, content, pinned')
          .is('deleted_at', null)
          .is('archived_at', null)
          .order('updated_at', { ascending: false })
          .limit(GLOBAL_SEARCH_RESULT_LIMIT),
      ])
      if (e1) throw e1
      if (e2) throw e2

      const decryptedCols = await decryptSpaces(spaces || [], cryptoKey)
      const decryptedItems = await decryptItems(items || [], cryptoKey)

      const colMap = Object.fromEntries(decryptedCols.map(c => [c.id, c.name]))
      const itemMeta = Object.fromEntries(
        decryptedItems.map(i => [i.id, { spaceName: colMap[i.space_id] || 'Unknown' }])
      )

      return {
        spaces: decryptedCols,
        items: decryptedItems,
        itemMeta,
      }
    },
    staleTime: 1000 * 60 * 5,
  })
}
