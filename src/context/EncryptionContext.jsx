/**
 * EncryptionContext.jsx - In-memory vault master key for client-side E2E encryption.
 *
 * The master AES key is unlocked with a vault PIN (independent of login password).
 * While signed in, the unlocked key is kept in sessionStorage so refresh does not
 * require re-entering the PIN until manual lock or 24-hour auto-lock.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './AuthContextCore'
import {
  setupUserVault,
  unlockUserVault,
  changeVaultPinWithVerification,
  createVaultRecoveryCode,
  changeVaultPinWithRecoveryCode,
  recoverVaultWithRecoveryCode,
  getVaultStatus,
} from '../lib/crypto/vault'
import {
  saveVaultSession,
  loadVaultSession,
  clearVaultSession,
  VAULT_UNLOCKED_AT_KEY,
} from '../lib/crypto/vaultSession'
import { VAULT_AUTO_LOCK_MS, VAULT_PIN_LOCKOUT_MS, VAULT_PIN_MAX_ATTEMPTS } from '../lib/constants'
import {
  getClientRateLimitStatus,
  recordClientRateLimitFailure,
  clearClientRateLimit,
} from '../lib/rateLimiter'

const EncryptionContext = createContext(null)

export function EncryptionProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [cryptoKey, setCryptoKey] = useState(null)
  const [unlocking, setUnlocking] = useState(false)
  const [sessionRestoring, setSessionRestoring] = useState(true)
  const [unlockError, setUnlockError] = useState('')
  const [vaultStatus, setVaultStatus] = useState({
    loading: true,
    hasVault: false,
  })

  const refreshVaultStatus = useCallback(async () => {
    if (!user?.id) {
      setVaultStatus({ loading: false, hasVault: false })
      return
    }
    setVaultStatus(s => ({ ...s, loading: true }))
    try {
      const status = await getVaultStatus(user.id)
      setVaultStatus({ loading: false, ...status })
    } catch {
      setVaultStatus({ loading: false, hasVault: false })
    }
  }, [user?.id])

  useEffect(() => {
    refreshVaultStatus()
  }, [refreshVaultStatus])

  const lock = useCallback(() => {
    clearVaultSession()
    setCryptoKey(null)
    setUnlockError('')
  }, [])

  const applyUnlockedKey = useCallback(async (key) => {
    if (user?.id) await saveVaultSession(user.id, key)
    setCryptoKey(key)
  }, [user?.id])

  const unlock = useCallback(async (pin) => {
    if (!user?.id) throw new Error('Not signed in')

    const rateKey = `vault-unlock:${user.id}`
    const status = getClientRateLimitStatus(rateKey, VAULT_PIN_MAX_ATTEMPTS)
    if (status.blocked) {
      const msg = `Too many failed PIN attempts. Try again in ${status.retryAfter} seconds.`
      setUnlockError(msg)
      throw new Error(msg)
    }

    setUnlocking(true)
    setUnlockError('')
    try {
      const key = await unlockUserVault(user.id, pin)
      clearClientRateLimit(rateKey)
      await applyUnlockedKey(key)
      return key
    } catch (err) {
      const msg = err?.message || 'Failed to unlock vault'
      if (msg.includes('Incorrect PIN') || msg.includes('cannot unlock')) {
        recordClientRateLimitFailure(rateKey, VAULT_PIN_MAX_ATTEMPTS, VAULT_PIN_LOCKOUT_MS)
      }
      setUnlockError(msg)
      throw err
    } finally {
      setUnlocking(false)
    }
  }, [user?.id, applyUnlockedKey])

  const setup = useCallback(async (pin) => {
    if (!user?.id) throw new Error('Not signed in')
    setUnlocking(true)
    setUnlockError('')
    try {
      const { masterKey, recoveryCode, recoveryUnavailable } = await setupUserVault(user.id, pin)
      await applyUnlockedKey(masterKey)
      await refreshVaultStatus()
      return { recoveryCode, recoveryUnavailable }
    } catch (err) {
      const msg = err?.message || 'Failed to set up vault'
      setUnlockError(msg)
      throw err
    } finally {
      setUnlocking(false)
    }
  }, [user?.id, applyUnlockedKey, refreshVaultStatus])

  const updatePin = useCallback(async (currentPin, newPin) => {
    if (!user?.id) throw new Error('Not signed in')
    setUnlocking(true)
    setUnlockError('')
    try {
      const key = await changeVaultPinWithVerification(user.id, currentPin, newPin)
      await applyUnlockedKey(key)
    } catch (err) {
      const msg = err?.message || 'Failed to change PIN'
      setUnlockError(msg)
      throw err
    } finally {
      setUnlocking(false)
    }
  }, [user?.id, applyUnlockedKey])

  const setupRecoveryCode = useCallback(async (currentPin) => {
    if (!user?.id) throw new Error('Not signed in')
    setUnlocking(true)
    setUnlockError('')
    try {
      const { masterKey, recoveryCode } = await createVaultRecoveryCode(user.id, currentPin)
      await applyUnlockedKey(masterKey)
      return { recoveryCode }
    } catch (err) {
      const msg = err?.message || 'Failed to set up recovery code'
      setUnlockError(msg)
      throw err
    } finally {
      setUnlocking(false)
    }
  }, [user?.id, applyUnlockedKey])

  const updatePinWithRecoveryCode = useCallback(async (recoveryCode, newPin) => {
    if (!user?.id) throw new Error('Not signed in')
    setUnlocking(true)
    setUnlockError('')
    try {
      const { masterKey, recoveryCode: nextRecoveryCode } =
        await changeVaultPinWithRecoveryCode(user.id, recoveryCode, newPin)
      await applyUnlockedKey(masterKey)
      return { recoveryCode: nextRecoveryCode }
    } catch (err) {
      const msg = err?.message || 'Failed to change PIN'
      setUnlockError(msg)
      throw err
    } finally {
      setUnlocking(false)
    }
  }, [user?.id, applyUnlockedKey])

  const recoverPinWithCode = useCallback(async (recoveryCode, newPin) => {
    if (!user?.id) throw new Error('Not signed in')
    setUnlocking(true)
    setUnlockError('')
    try {
      const { masterKey, recoveryCode: nextRecoveryCode } =
        await recoverVaultWithRecoveryCode(user.id, recoveryCode, newPin)
      await applyUnlockedKey(masterKey)
      return { recoveryCode: nextRecoveryCode }
    } catch (err) {
      const msg = err?.message || 'Failed to recover vault PIN'
      setUnlockError(msg)
      throw err
    } finally {
      setUnlocking(false)
    }
  }, [user?.id, applyUnlockedKey])

  // Wait for auth hydration before clearing or restoring vault session.
  // Clearing while user is briefly null on refresh was wiping sessionStorage.
  useEffect(() => {
    if (authLoading) return

    if (!user?.id) {
      clearVaultSession()
      setCryptoKey(null)
      setSessionRestoring(false)
      return
    }

    let cancelled = false
    setSessionRestoring(true)
    loadVaultSession(user.id).then(key => {
      if (cancelled) return
      if (key) setCryptoKey(key)
      setSessionRestoring(false)
    })
    return () => { cancelled = true }
  }, [user?.id, authLoading])

  const lockRef = useRef(lock)
  lockRef.current = lock

  useEffect(() => {
    if (!cryptoKey) return

    const stored = sessionStorage.getItem(VAULT_UNLOCKED_AT_KEY)
    const unlockedAt = stored ? Number(stored) : Date.now()
    if (!stored) sessionStorage.setItem(VAULT_UNLOCKED_AT_KEY, String(unlockedAt))

    const remaining = VAULT_AUTO_LOCK_MS - (Date.now() - unlockedAt)
    if (remaining <= 0) {
      lockRef.current()
      window.dispatchEvent(new CustomEvent('arche:vault-auto-locked'))
      return
    }

    const timer = setTimeout(() => {
      lockRef.current()
      window.dispatchEvent(new CustomEvent('arche:vault-auto-locked'))
    }, remaining)

    return () => clearTimeout(timer)
  }, [cryptoKey])

  const isUnlocked = !!cryptoKey && !!user

  return (
    <EncryptionContext.Provider
      value={{
        cryptoKey,
        isUnlocked,
        unlocking,
        sessionRestoring,
        unlockError,
        vaultStatus,
        unlock,
        setup,
        updatePin,
        setupRecoveryCode,
        updatePinWithRecoveryCode,
        recoverPinWithCode,
        lock,
        refreshVaultStatus,
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
