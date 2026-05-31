/**
 * useSessionTimeout.js — Inactivity + absolute session timeout.
 *
 * Signs the user out after 2 hours of zero interaction (no mouse
 * movement, keyboard input, clicks, touch, or scroll).
 *
 * Also enforces an absolute maximum session lifetime of 24 hours
 * regardless of activity — preventing indefinite sessions.
 *
 * Implementation notes:
 *   - The reset function is stored in useCallback so the event
 *     listeners always reference the same stable function.
 *   - Every user interaction resets the inactivity timer.
 *   - The absolute timer is set once on mount and never reset.
 */

import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SESSION_INACTIVITY_MS, SESSION_ABSOLUTE_MAX_MS } from '../lib/constants'

export function useSessionTimeout() {
  const inactivityTimer = useRef(null)
  const absoluteTimer = useRef(null)

  /**
   * Stable reset function — clears the old inactivity timer and
   * starts a new one. Stored in useCallback so the reference
   * never changes between renders.
   */
  const reset = useCallback(() => {
    clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(async () => {
      await supabase.auth.signOut()
    }, SESSION_INACTIVITY_MS)
  }, [])

  useEffect(() => {
    // Events that count as "user activity"
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']

    // Attach listeners (passive so they don't block scrolling)
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))

    // Start the initial inactivity timer
    reset()

    // ── Absolute session expiry ──
    // This timer fires regardless of activity. Once the session
    // has lasted 24 hours, the user must re-authenticate.
    absoluteTimer.current = setTimeout(async () => {
      await supabase.auth.signOut()
    }, SESSION_ABSOLUTE_MAX_MS)

    // Cleanup: remove all listeners and cancel both timers
    return () => {
      clearTimeout(inactivityTimer.current)
      clearTimeout(absoluteTimer.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [reset])
}
