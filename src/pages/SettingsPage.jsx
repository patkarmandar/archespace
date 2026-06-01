/**
 * SettingsPage.jsx - Account password, vault PIN, import/export.
 */
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, Upload, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useEncryption } from '../context/EncryptionContext'
import { useToast } from '../context/ToastContext'
import { useCollections } from '../hooks/useCollections'
import { exportCollections, importCollections } from '../lib/exportImport'
import { supabase } from '../lib/supabase'
import PinInput from '../components/PinInput'
import { validateVaultPin } from '../lib/crypto/vaultPin'
import { VAULT_PIN_MIN_LENGTH, VAULT_PIN_MAX_LENGTH } from '../lib/constants'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, signIn, signOut } = useAuth()
  const { cryptoKey, updatePin, unlocking } = useEncryption()
  const { toast } = useToast()
  const { data: collections = [] } = useCollections()
  const queryClient = useQueryClient()
  const importRef = useRef(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const [passwordLoading, setPasswordLoading] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    setPasswordLoading(true)
    const { error: verifyError } = await signIn(user.email, currentPassword)
    if (verifyError) {
      toast.error('Current password is incorrect.')
      setPasswordLoading(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Login password updated.')
  }

  const handleChangePin = async (e) => {
    e.preventDefault()
    const pinErr = validateVaultPin(newPin)
    if (pinErr) {
      toast.error(pinErr)
      return
    }
    if (newPin !== confirmPin) {
      toast.error('New PINs do not match.')
      return
    }
    setPinLoading(true)
    try {
      await updatePin(currentPin, newPin)
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      toast.success('Vault PIN updated.')
    } catch (err) {
      toast.error(err?.message || 'Failed to change vault PIN.')
    }
    setPinLoading(false)
  }

  const handleExport = async () => {
    try {
      await exportCollections(collections, cryptoKey)
      toast.success('Backup exported successfully')
    } catch {
      toast.error('Failed to export backup')
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importCollections(file, user.id, cryptoKey)
      await queryClient.invalidateQueries({ queryKey: ['collections'] })
      await queryClient.invalidateQueries({ queryKey: ['bin'] })
      toast.success('Backup imported successfully')
    } catch (err) {
      toast.error('Failed to import backup — invalid format')
      console.error(err)
    }
    e.target.value = ''
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="sticky top-0 z-20 glass">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <h1 className="text-sm font-semibold text-text-primary">Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">
        <section className="bg-bg-surface border border-bg-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Login password</h2>
          <p className="text-text-muted text-xs">Used to sign in. Separate from your vault PIN.</p>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label htmlFor="current-password" className="block text-xs font-medium text-text-secondary mb-1.5">
                Current password
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="password-field w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                  aria-label="Toggle password visibility"
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="new-password" className="block text-xs font-medium text-text-secondary mb-1.5">
                New password
              </label>
              <input
                id="new-password"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="password-field w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-medium text-text-secondary mb-1.5">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="password-field w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
            >
              {passwordLoading ? 'Updating…' : 'Change login password'}
            </button>
          </form>
        </section>

        <section className="bg-bg-surface border border-bg-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Vault PIN</h2>
          <p className="text-text-muted text-xs">
            Unlocks your encrypted data after sign-in. {VAULT_PIN_MIN_LENGTH}–{VAULT_PIN_MAX_LENGTH} digits.
          </p>
          <form onSubmit={handleChangePin} className="space-y-3">
            <PinInput
              id="settings-current-pin"
              label="Current vault PIN"
              value={currentPin}
              onChange={setCurrentPin}
              disabled={pinLoading || unlocking}
            />
            <PinInput
              id="settings-new-pin"
              label="New vault PIN"
              value={newPin}
              onChange={setNewPin}
              disabled={pinLoading || unlocking}
            />
            <PinInput
              id="settings-confirm-pin"
              label="Confirm new vault PIN"
              value={confirmPin}
              onChange={setConfirmPin}
              disabled={pinLoading || unlocking}
            />
            <button
              type="submit"
              disabled={pinLoading || unlocking}
              className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
            >
              {pinLoading || unlocking ? 'Updating…' : 'Change vault PIN'}
            </button>
          </form>
        </section>

        <section className="bg-bg-surface border border-bg-border rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Backup</h2>
          <p className="text-text-muted text-xs">Export or import all collections as JSON.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-bg-border bg-bg-elevated hover:bg-bg-base text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
            >
              <Download size={15} />
              Export backup
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-bg-border bg-bg-elevated hover:bg-bg-base text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
            >
              <Upload size={15} />
              Import backup
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </section>

        <section className="text-center">
          <button
            type="button"
            onClick={() => {
              signOut()
              toast.info('Signed out')
            }}
            className="text-sm text-text-muted hover:text-danger transition-colors"
          >
            Sign out
          </button>
        </section>
      </main>
    </div>
  )
}
