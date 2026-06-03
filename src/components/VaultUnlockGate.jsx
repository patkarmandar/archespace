/**
 * VaultUnlockGate.jsx - Post-login vault PIN unlock or setup.
 */
import { useState } from 'react'
import { Shield, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useEncryption } from '../context/EncryptionContext'
import PinInput from './PinInput'
import { VAULT_PIN_MAX_LENGTH, VAULT_PIN_MIN_LENGTH } from '../lib/constants'
import { validateVaultPin } from '../lib/crypto/vaultPin'

export default function VaultUnlockGate({ children }) {
  const { user, signOut, loading: authLoading } = useAuth()
  const {
    isUnlocked,
    unlock,
    setup,
    migrateFromPassword,
    unlocking,
    unlockError,
    vaultStatus,
    sessionRestoring,
    clearUnlockError,
  } = useEncryption()

  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  if (!user) return children
  if (authLoading || vaultStatus.loading || sessionRestoring) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <p className="text-text-muted text-sm">Loading vault…</p>
      </div>
    )
  }
  if (isUnlocked) return children

  const needsSetup = !vaultStatus.hasVault
  const needsMigration = vaultStatus.needsMigration

  const resetFields = () => {
    setPin('')
    setConfirmPin('')
    setPassword('')
  }

  const handleUnlock = async (e) => {
    e.preventDefault()
    clearUnlockError()
    try {
      await unlock(pin)
      resetFields()
    } catch {
      // unlockError set in context
    }
  }

  const handleSetup = async (e) => {
    e.preventDefault()
    clearUnlockError()
    const err = validateVaultPin(pin)
    if (err) {
      clearUnlockError()
      return
    }
    if (pin !== confirmPin) {
      return
    }
    try {
      await setup(pin)
      resetFields()
    } catch {
      // unlockError set in context
    }
  }

  const handleMigrate = async (e) => {
    e.preventDefault()
    clearUnlockError()
    if (pin !== confirmPin) return
    try {
      await migrateFromPassword(password, pin)
      resetFields()
    } catch {
      // unlockError set in context
    }
  }

  const pinMismatch = confirmPin.length > 0 && pin !== confirmPin
  const setupPinInvalid = needsSetup && pin.length > 0 && validateVaultPin(pin)
  const canSubmitSetup = pin.length >= VAULT_PIN_MIN_LENGTH && pin === confirmPin && !validateVaultPin(pin)
  const canSubmitMigrate = password.length > 0 && canSubmitSetup

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <Shield size={26} className="text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">
            {needsMigration ? 'Upgrade your vault' : needsSetup ? 'Create vault PIN' : 'Unlock your vault'}
          </h1>
          <p className="text-text-muted text-sm mt-2 leading-relaxed">
            {needsMigration
              ? 'Enter your account password once, then choose a vault PIN. Your encrypted data stays the same.'
              : needsSetup
                ? `Choose a ${VAULT_PIN_MIN_LENGTH}–${VAULT_PIN_MAX_LENGTH} digit PIN to encrypt and unlock your spaces on this device.`
                : 'Enter your vault PIN to decrypt your spaces on this device.'}
          </p>
        </div>

        <form
          onSubmit={needsMigration ? handleMigrate : needsSetup ? handleSetup : handleUnlock}
          className="bg-bg-surface border border-bg-border rounded-2xl p-6 space-y-3"
        >
          {needsMigration && (
            <div>
              <label htmlFor="migrate-password" className="block text-xs font-medium text-text-secondary mb-1.5">
                Account password (one time)
              </label>
              <div className="relative">
                <input
                  id="migrate-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="password-field w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <PinInput
            id="vault-pin"
            label={needsSetup || needsMigration ? 'New vault PIN' : 'Vault PIN'}
            value={pin}
            onChange={setPin}
            autoComplete={needsSetup ? 'new-password' : 'off'}
            disabled={unlocking}
          />

          {(needsSetup || needsMigration) && (
            <PinInput
              id="vault-pin-confirm"
              label="Confirm vault PIN"
              value={confirmPin}
              onChange={setConfirmPin}
              autoComplete="new-password"
              disabled={unlocking}
            />
          )}

          {setupPinInvalid && (
            <p className="text-danger text-xs">{setupPinInvalid}</p>
          )}

          {pinMismatch && (needsSetup || needsMigration) && (
            <p className="text-danger text-xs">PINs do not match.</p>
          )}

          {unlockError && (
            <p className="text-danger text-xs bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {unlockError}
            </p>
          )}

          <button
            type="submit"
            disabled={
              unlocking ||
              (needsMigration ? !canSubmitMigrate : needsSetup ? !canSubmitSetup : pin.length < VAULT_PIN_MIN_LENGTH)
            }
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
          >
            <Lock size={14} />
            {unlocking
              ? 'Working…'
              : needsMigration
                ? 'Upgrade & unlock'
                : needsSetup
                  ? 'Create PIN'
                  : 'Unlock vault'}
          </button>

          <button
            type="button"
            onClick={() => signOut()}
            className="w-full px-4 py-3 rounded-xl border border-bg-border bg-bg-surface hover:bg-danger/10 hover:border-danger/30 text-sm font-semibold text-text-secondary hover:text-danger transition-colors"
          >
            Sign out
          </button>
        </form>

        <p className="text-center text-text-muted text-[10px] mt-6 leading-relaxed">
          Vault PIN is separate from your login password · AES-256-GCM
        </p>
      </div>
    </div>
  )
}
