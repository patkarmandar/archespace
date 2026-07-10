/**
 * AuthContext.jsx - Authentication provider for Arche.
 *
 * Wraps the app in a React context that exposes:
 *   - `user`    - the current Supabase User object (or null)
 *   - `loading` - true while the initial session check is in flight
 *   - `signIn`  - sign in with email + password
 *   - `signOut` - end the session
 *
 * On mount the provider:
 *   1. Fetches the existing session (e.g. from a stored refresh token).
 *   2. Subscribes to auth state changes so the UI stays in sync
 *      when tokens refresh or the user signs out in another tab.
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { clearVaultSession } from '../lib/crypto/vaultSession'
import { AuthContext } from './AuthContextCore'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    // 1. Hydrate from the persisted session (cookie / localStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 2. Listen for future auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setPasswordRecovery(false)
      }
    )

    // Cleanup: unsubscribe on unmount
    return () => subscription.unsubscribe()
  }, [])

  /** Sign in with email/password credentials */
  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  /** Register a new account (multi-user mode) */
  const signUp = (email, password, metadata = {}) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })

  /** Send a password reset email. */
  const requestPasswordReset = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

  /** Request an account email change through Supabase Auth. */
  const updateEmail = (email) =>
    supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/login` }
    )

  /** Update password, revoke all sessions, and force a fresh sign-in. */
  const updatePasswordAndSignOut = async (password, afterUpdate) => {
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) return { error: updateError }
    if (afterUpdate) {
      try {
        await afterUpdate()
      } catch (error) {
        return { error }
      }
    }

    clearVaultSession()
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' })
    if (!signOutError) setPasswordRecovery(false)
    return { error: signOutError }
  }

  /** End the current session */
  const signOut = (options) => {
    clearVaultSession()
    setPasswordRecovery(false)
    return supabase.auth.signOut(options)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        updateEmail,
        updatePasswordAndSignOut,
        passwordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
