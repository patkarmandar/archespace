/**
 * VaultUnlockGate.jsx - Post-login vault PIN unlock or setup.
 */
import { useState } from 'react'
import { Shield, Lock } from 'lucide-react'
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
    unlocking,
    unlockError,
    vaultStatus,
    sessionRestoring,
    clearUnlockError,
  } = useEncryption()

  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

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

  const resetFields = () => {
    setPin('')
    setConfirmPin('')
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

  const pinMismatch = confirmPin.length > 0 && pin !== confirmPin
  const setupPinInvalid = needsSetup && pin.length > 0 && validateVaultPin(pin)
  const canSubmitSetup = pin.length >= VAULT_PIN_MIN_LENGTH && pin === confirmPin && !validateVaultPin(pin)

  return (
    <div className="min-h-[100svh] bg-bg-base flex items-start sm:items-center justify-center px-4 pt-16 pb-6 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Shield size={24} className="text-accent sm:w-[26px] sm:h-[26px]" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">
            {needsSetup ? 'Create vault PIN' : 'Unlock your vault'}
          </h1>
          <p className="text-text-muted text-sm mt-1.5 sm:mt-2 leading-relaxed">
            {needsSetup
              ? `Choose a ${VAULT_PIN_MIN_LENGTH}–${VAULT_PIN_MAX_LENGTH} digit PIN to encrypt and unlock your spaces on this device.`
              : 'Enter your vault PIN to decrypt your spaces on this device.'}
          </p>
        </div>

        <form
          onSubmit={needsSetup ? handleSetup : handleUnlock}
          className="bg-bg-surface border border-bg-border rounded-2xl p-6 space-y-3"
        >
          <PinInput
            id="vault-pin"
            label={needsSetup ? 'New vault PIN' : 'Vault PIN'}
            value={pin}
            onChange={setPin}
            autoComplete={needsSetup ? 'new-password' : 'off'}
            disabled={unlocking}
          />

          {needsSetup && (
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

          {pinMismatch && needsSetup && (
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
              (needsSetup ? !canSubmitSetup : pin.length < VAULT_PIN_MIN_LENGTH)
            }
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
          >
            <Lock size={14} />
            {unlocking
              ? 'Working…'
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

        <p className="text-center text-text-muted text-[10px] mt-4 sm:mt-6 leading-relaxed">
          Vault PIN is separate from your login password.
        </p>
      </div>
    </div>
  )
}
