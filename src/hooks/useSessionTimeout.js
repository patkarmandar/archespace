/**
 * useSessionTimeout.js — Inactivity auto-logout.
 *
 * Signs the user out after 2 hours of zero interaction (no mouse
 * movement, keyboard input, clicks, touch, or scroll).
 *
 * Implementation notes:
 *   - The reset function is stored in a ref so the event listeners
 *     always reference the same stable function. Without this,
 *     removeEventListener would fail (different closure each render)
 *     and listeners would leak.
 *   - Every user interaction resets the timer.
 */

import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/** Inactivity limit before auto-logout (2 hours) */
const TIMEOUT_MS = 2 * 60 * 60 * 1000

export function useSessionTimeout() {
  const timerRef = useRef(null)

  /**
   * Stable reset function — clears the old timer and starts a
   * new one. Stored in useCallback so the reference never changes
   * between renders, which means removeEventListener works correctly.
   */
  const reset = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await supabase.auth.signOut()
    }, TIMEOUT_MS)
  }, [])

  useEffect(() => {
    // Events that count as "user activity"
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']

    // Attach listeners (passive so they don't block scrolling)
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))

    // Start the initial timer
    reset()

    // Cleanup: remove all listeners and cancel the timer
    return () => {
      clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [reset])
}
