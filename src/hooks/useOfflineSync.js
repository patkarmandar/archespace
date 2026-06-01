/**
 * useOfflineSync.js - Flush offline write queue when back online.
 */
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { flushOfflineQueue, getOfflineQueue } from '../lib/offlineQueue'
import { useToast } from '../context/ToastContext'

export function useOfflineSync() {
  const qc = useQueryClient()
  const { toast } = useToast()

  useEffect(() => {
    const processQueue = async () => {
      const pending = getOfflineQueue().length
      if (pending === 0) return

      const flushed = await flushOfflineQueue(async (entry) => {
        if (entry.type === 'item-update') {
          const { id, title, content } = entry.payload
          const { error } = await supabase
            .from('collection_items')
            .update({ title, content })
            .eq('id', id)
          return !error
        }
        return false
      })

      if (flushed > 0) {
        toast.info(`Synced ${flushed} offline change${flushed === 1 ? '' : 's'}`)
        qc.invalidateQueries({ queryKey: ['items'] })
      }
    }

    const onOnline = () => processQueue()
    window.addEventListener('online', onOnline)
    if (navigator.onLine) processQueue()
    return () => window.removeEventListener('online', onOnline)
  }, [qc, toast])
}
