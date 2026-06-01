/**
 * useGlobalSearch.js - Loads data for cross-collection search.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useEncryption } from '../context/EncryptionContext'
import { decryptCollections, decryptItems } from '../lib/dataProtection'

export function useGlobalSearchData() {
  const { cryptoKey } = useEncryption()

  return useQuery({
    queryKey: ['global-search-data'],
    enabled: !!cryptoKey,
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

      const decryptedCols = await decryptCollections(collections || [], cryptoKey)
      const decryptedItems = await decryptItems(items || [], cryptoKey)

      const colMap = Object.fromEntries(decryptedCols.map(c => [c.id, c.name]))
      const itemMeta = Object.fromEntries(
        decryptedItems.map(i => [i.id, { collectionName: colMap[i.collection_id] || 'Unknown' }])
      )

      return {
        collections: decryptedCols,
        items: decryptedItems,
        itemMeta,
      }
    },
    staleTime: 1000 * 60,
  })
}
