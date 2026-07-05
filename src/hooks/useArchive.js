/**
 * useArchive.js - Archived spaces and items (reversible, not deleted).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useEncryption } from '../context/EncryptionCore'
import { fetchStoredCollection } from '../lib/storedCollectionQuery'
import { invalidateArchive } from '../lib/queryInvalidation'

export function useArchive() {
  const qc = useQueryClient()
  const { cryptoKey } = useEncryption()

  const query = useQuery({
    queryKey: ['archive'],
    enabled: !!cryptoKey,
    queryFn: () => fetchStoredCollection({
      cryptoKey,
      spaceQuery: q => q
        .not('archived_at', 'is', null)
        .is('deleted_at', null)
        .order('archived_at', { ascending: false }),
      itemQuery: q => q
        .not('archived_at', 'is', null)
        .is('deleted_at', null)
        .order('archived_at', { ascending: false }),
    }),
  })

  const unarchiveSpace = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('spaces')
        .update({ archived_at: null })
        .eq('id', id)
      if (error) throw error
      const { error: itemError } = await supabase
        .from('space_items')
        .update({ archived_at: null })
        .eq('space_id', id)
        .not('archived_at', 'is', null)
      if (itemError) throw itemError
    },
    onSuccess: () => invalidateArchive(qc),
  })

  const bulkUnarchiveSpaces = useMutation({
    mutationFn: async (ids) => {
      if (!ids?.length) return
      const { error: colErr } = await supabase
        .from('spaces')
        .update({ archived_at: null })
        .in('id', ids)
      if (colErr) throw colErr
      const { error: itemErr } = await supabase
        .from('space_items')
        .update({ archived_at: null })
        .in('space_id', ids)
      if (itemErr) throw itemErr
    },
    onSuccess: () => invalidateArchive(qc),
  })

  const bulkUnarchiveItems = useMutation({
    mutationFn: async (ids) => {
      if (!ids?.length) return
      const { error } = await supabase
        .from('space_items')
        .update({ archived_at: null })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => invalidateArchive(qc),
  })

  const unarchiveItem = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('space_items')
        .update({ archived_at: null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateArchive(qc),
  })

  const total =
    (query.data?.spaces?.length || 0) +
    (query.data?.items?.length || 0)

  return {
    ...query,
    unarchiveSpace,
    unarchiveItem,
    bulkUnarchiveSpaces,
    bulkUnarchiveItems,
    total,
  }
}
