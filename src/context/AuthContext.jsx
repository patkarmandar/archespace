/**
 * AuthContext.jsx — Authentication provider for Arche.
 *
 * Wraps the app in a React context that exposes:
 *   - `user`    — the current Supabase User object (or null)
 *   - `loading` — true while the initial session check is in flight
 *   - `signIn`  — sign in with email + password
 *   - `signOut` — end the session
 *
 * On mount the provider:
 *   1. Fetches the existing session (e.g. from a stored refresh token).
 *   2. Subscribes to auth state changes so the UI stays in sync
 *      when tokens refresh or the user signs out in another tab.
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Hydrate from the persisted session (cookie / localStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 2. Listen for future auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    // Cleanup: unsubscribe on unmount
    return () => subscription.unsubscribe()
  }, [])

  /** Sign in with email/password credentials */
  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  /** End the current session */
  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access the auth context.
 * Must be used inside an <AuthProvider>.
 */
export const useAuth = () => useContext(AuthContext)
