import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const TIMEOUT_MS = 2 * 60 * 60 * 1000 // 2 hours of inactivity

export function useSessionTimeout() {
  const timer = useRef(null)

  const reset = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await supabase.auth.signOut()
    }, TIMEOUT_MS)
  }

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      clearTimeout(timer.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [])
}
