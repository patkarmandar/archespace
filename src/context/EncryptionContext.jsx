/**
 * EncryptionContext.jsx - In-memory vault key for client-side E2E encryption.
 *
 * The AES key is derived from the user's password (PBKDF2) and kept only
 * in memory for the session. It is never sent to Supabase.
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { setupUserVault, unlockUserVault } from '../lib/crypto/vault'

const EncryptionContext = createContext(null)

export function EncryptionProvider({ children }) {
  const { user } = useAuth()
  const [cryptoKey, setCryptoKey] = useState(null)
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState('')

  const lock = useCallback(() => {
    setCryptoKey(null)
    setUnlockError('')
  }, [])

  const unlock = useCallback(async (password) => {
    if (!user?.id) throw new Error('Not signed in')
    setUnlocking(true)
    setUnlockError('')
    try {
      const key = await unlockUserVault(user.id, password)
      setCryptoKey(key)
      return key
    } catch (err) {
      const msg = err?.message || 'Failed to unlock vault'
      setUnlockError(msg)
      throw err
    } finally {
      setUnlocking(false)
    }
  }, [user?.id])

  const setup = useCallback(async (password) => {
    if (!user?.id) throw new Error('Not signed in')
    setUnlocking(true)
    setUnlockError('')
    try {
      const key = await setupUserVault(user.id, password)
      setCryptoKey(key)
      return key
    } catch (err) {
      const msg = err?.message || 'Failed to set up encryption'
      setUnlockError(msg)
      throw err
    } finally {
      setUnlocking(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) lock()
  }, [user, lock])

  const isUnlocked = !!cryptoKey && !!user

  return (
    <EncryptionContext.Provider
      value={{
        cryptoKey,
        isUnlocked,
        unlocking,
        unlockError,
        unlock,
        setup,
        lock,
        clearUnlockError: () => setUnlockError(''),
      }}
    >
      {children}
    </EncryptionContext.Provider>
  )
}

export function useEncryption() {
  const ctx = useContext(EncryptionContext)
  if (!ctx) throw new Error('useEncryption must be used within EncryptionProvider')
  return ctx
}
