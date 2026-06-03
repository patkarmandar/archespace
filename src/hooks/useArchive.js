/**
 * useArchive.js - Archived spaces and items (reversible, not deleted).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useEncryption } from '../context/EncryptionContext'
import { decryptSpaces, decryptItems } from '../lib/dataProtection'

export function useArchive() {
  const qc = useQueryClient()
  const { cryptoKey } = useEncryption()

  const query = useQuery({
    queryKey: ['archive'],
    enabled: !!cryptoKey,
    queryFn: async () => {
      const [{ data: spaces, error: e1 }, { data: items, error: e2 }] =
        await Promise.all([
          supabase
            .from('spaces')
            .select('*')
            .not('archived_at', 'is', null)
            .is('deleted_at', null)
            .order('archived_at', { ascending: false }),
          supabase
            .from('space_items')
            .select('*')
            .not('archived_at', 'is', null)
            .is('deleted_at', null)
            .order('archived_at', { ascending: false }),
        ])
      if (e1) throw e1
      if (e2) throw e2
      return {
        spaces: await decryptSpaces(spaces || [], cryptoKey),
        items: await decryptItems(items || [], cryptoKey),
      }
    },
  })

  const unarchiveSpace = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('spaces')
        .update({ archived_at: null })
        .eq('id', id)
      if (error) throw error
      await supabase
        .from('space_items')
        .update({ archived_at: null })
        .eq('space_id', id)
        .not('archived_at', 'is', null)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['archive'] })
      qc.invalidateQueries({ queryKey: ['spaces'] })
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['space-stats'] })
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['archive'] })
      qc.invalidateQueries({ queryKey: ['spaces'] })
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['space-stats'] })
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['archive'] })
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['space-stats'] })
    },
  })

  const unarchiveItem = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('space_items')
        .update({ archived_at: null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['archive'] })
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['space-stats'] })
    },
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
