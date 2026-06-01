/**
 * useSessionTimeout.js - Absolute session timeout only.
 *
 * Signs the user out after one week regardless of activity.
 * Sessions persist until manual sign-out or this limit.
 */

import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { SESSION_ABSOLUTE_MAX_MS } from '../lib/constants'

export function useSessionTimeout() {
  const absoluteTimer = useRef(null)

  useEffect(() => {
    absoluteTimer.current = setTimeout(async () => {
      window.dispatchEvent(new CustomEvent('arche:session-expired', { detail: { reason: 'absolute' } }))
      await supabase.auth.signOut()
    }, SESSION_ABSOLUTE_MAX_MS)

    return () => {
      clearTimeout(absoluteTimer.current)
    }
  }, [])
}
