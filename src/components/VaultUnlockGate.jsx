/**
 * VaultUnlockGate.jsx - Prompt for password to derive decryption key.
 */
import { useState } from 'react'
import { Shield, Eye, EyeOff, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useEncryption } from '../context/EncryptionContext'

export default function VaultUnlockGate({ children }) {
  const { user, signOut } = useAuth()
  const { isUnlocked, unlock, unlocking, unlockError, clearUnlockError } = useEncryption()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  if (!user) return children
  if (isUnlocked) return children

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearUnlockError()
    try {
      await unlock(password)
      setPassword('')
    } catch {
      // unlockError set in context
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <Shield size={26} className="text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Unlock your vault</h1>
          <p className="text-text-muted text-sm mt-2 leading-relaxed">
            Your collections and items are encrypted. Enter your account password to decrypt them on this device.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-bg-surface border border-bg-border rounded-2xl p-6 space-y-3">
          <div>
            <label htmlFor="vault-password" className="block text-xs font-medium text-text-secondary mb-1.5">
              Account password
            </label>
            <div className="relative">
              <input
                id="vault-password"
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

          {unlockError && (
            <p className="text-danger text-xs bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {unlockError}
            </p>
          )}

          <button
            type="submit"
            disabled={unlocking || !password}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
          >
            <Lock size={14} />
            {unlocking ? 'Unlocking…' : 'Unlock vault'}
          </button>

          <button
            type="button"
            onClick={() => signOut()}
            className="w-full text-text-muted hover:text-text-secondary text-xs py-2"
          >
            Sign out
          </button>
        </form>

        <p className="text-center text-text-muted text-[10px] mt-6 leading-relaxed">
          AES-256-GCM · Key derived locally · Server only stores encrypted data
        </p>
      </div>
    </div>
  )
}
