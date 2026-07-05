/**
 * SettingsPage.jsx - Account password, vault PIN, import/export.
 */
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, Upload, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContextCore'
import { useEncryption } from '../context/EncryptionCore'
import { useToast } from '../context/ToastCore'
import { useSpaces } from '../hooks/useSpaces'
import { exportSpaces, importSpaces } from '../lib/exportImport'
import PinInput from '../components/PinInput'
import { validateVaultPin, getWeakPinWarning } from '../lib/crypto/vaultPin'
import WeakPinWarning from '../components/WeakPinWarning'
import { VAULT_PIN_MIN_LENGTH, VAULT_PIN_MAX_LENGTH } from '../lib/constants'
import { PASSWORD_RULES, validatePassword } from '../lib/passwordPolicy'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, signIn, signOut, requestPasswordReset, updatePasswordAndSignOut } = useAuth()
  const { cryptoKey, updatePin, setupRecoveryCode, updatePinWithRecoveryCode, unlocking } = useEncryption()
  const { toast } = useToast()
  const { data: spaces = [] } = useSpaces()
  const queryClient = useQueryClient()
  const importRef = useRef(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [recoverySetupPin, setRecoverySetupPin] = useState('')
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('')
  const [recoveryPin, setRecoveryPin] = useState('')
  const [confirmRecoveryPin, setConfirmRecoveryPin] = useState('')
  const [oneTimeRecoveryCode, setOneTimeRecoveryCode] = useState('')

  const [passwordLoading, setPasswordLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)
  const [recoverySetupLoading, setRecoverySetupLoading] = useState(false)
  const [pinRecoveryLoading, setPinRecoveryLoading] = useState(false)
  const [openSection, setOpenSection] = useState('password')

  const handleChangePassword = async (e) => {
    e.preventDefault()
    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      toast.error(passwordError.replace('Password', 'New password'))
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
    const { error } = await updatePasswordAndSignOut(newPassword)
    setPasswordLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Login password updated. Sign in again with your new password.')
    navigate('/login?reset=success', { replace: true })
  }

  const handleSendPasswordReset = async () => {
    if (!user?.email) {
      toast.error('No email address is available for this account.')
      return
    }
    setResetLoading(true)
    const { error } = await requestPasswordReset(user.email)
    setResetLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Password reset link sent. Check your email.')
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

  const handleSetupRecoveryCode = async (e) => {
    e.preventDefault()
    setRecoverySetupLoading(true)
    try {
      const { recoveryCode } = await setupRecoveryCode(recoverySetupPin)
      setRecoverySetupPin('')
      setOneTimeRecoveryCode(recoveryCode)
      toast.success('Recovery code created. Save it now.')
    } catch (err) {
      toast.error(err?.message || 'Failed to create recovery code.')
    }
    setRecoverySetupLoading(false)
  }

  const handleChangePinWithRecoveryCode = async (e) => {
    e.preventDefault()
    const pinErr = validateVaultPin(recoveryPin)
    if (pinErr) {
      toast.error(pinErr)
      return
    }
    if (recoveryPin !== confirmRecoveryPin) {
      toast.error('New PINs do not match.')
      return
    }
    setPinRecoveryLoading(true)
    try {
      const { recoveryCode } = await updatePinWithRecoveryCode(recoveryCodeInput, recoveryPin)
      setRecoveryCodeInput('')
      setRecoveryPin('')
      setConfirmRecoveryPin('')
      setOneTimeRecoveryCode(recoveryCode)
      toast.success('Vault PIN updated. Save your new recovery code.')
    } catch (err) {
      toast.error(err?.message || 'Failed to reset vault PIN.')
    }
    setPinRecoveryLoading(false)
  }

  const handleExport = async () => {
    try {
      await exportSpaces(spaces, cryptoKey)
      toast.success('Backup exported successfully')
    } catch {
      toast.error('Failed to export backup')
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importSpaces(file, user.id, cryptoKey)
      await queryClient.invalidateQueries({ queryKey: ['spaces'] })
      await queryClient.invalidateQueries({ queryKey: ['bin'] })
      toast.success('Backup imported successfully')
    } catch (err) {
      toast.error('Failed to import backup - invalid format')
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
            onClick={() => navigate('/app')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bg-border bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-all text-sm font-medium"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <h1 className="text-sm font-semibold text-text-primary">Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
          <section className="border-b border-bg-border">
            <button
              type="button"
              onClick={() => setOpenSection(s => (s === 'password' ? '' : 'password'))}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-bg-elevated/40 transition-colors"
            >
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Login password</h2>
                <p className="text-text-muted text-xs mt-0.5">Used to sign in. Separate from your vault PIN.</p>
              </div>
              <ChevronDown
                size={16}
                className={`text-text-muted transition-transform ${openSection === 'password' ? 'rotate-180' : ''}`}
              />
            </button>
            {openSection === 'password' && (
              <div className="px-4 pb-4">
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
                      minLength={PASSWORD_RULES.minLength}
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
                  <button
                    type="button"
                    onClick={handleSendPasswordReset}
                    disabled={resetLoading}
                    className="w-full px-4 py-3 rounded-xl border border-bg-border bg-bg-elevated hover:bg-bg-base text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending reset link…' : 'Forgot current password? Send reset link'}
                  </button>
                </form>
              </div>
            )}
          </section>

          <section className="border-b border-bg-border">
            <button
              type="button"
              onClick={() => setOpenSection(s => (s === 'pin' ? '' : 'pin'))}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-bg-elevated/40 transition-colors"
            >
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Vault PIN</h2>
                <p className="text-text-muted text-xs mt-0.5">
                  Unlocks encrypted data. {VAULT_PIN_MIN_LENGTH}–{VAULT_PIN_MAX_LENGTH} digits.
                </p>
              </div>
              <ChevronDown
                size={16}
                className={`text-text-muted transition-transform ${openSection === 'pin' ? 'rotate-180' : ''}`}
              />
            </button>
            {openSection === 'pin' && (
              <div className="px-4 pb-4">
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
                  <WeakPinWarning message={!validateVaultPin(newPin) ? getWeakPinWarning(newPin) : null} />
                  <button
                    type="submit"
                    disabled={pinLoading || unlocking}
                    className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    {pinLoading || unlocking ? 'Updating…' : 'Change vault PIN'}
                  </button>
                </form>

                <div className="my-5 border-t border-bg-border" />

                <form onSubmit={handleSetupRecoveryCode} className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Set up recovery code</h3>
                    <p className="text-text-muted text-xs mt-0.5">Use your current vault PIN to create or replace your one-time recovery code.</p>
                  </div>
                  <PinInput
                    id="settings-recovery-setup-pin"
                    label="Current vault PIN"
                    value={recoverySetupPin}
                    onChange={setRecoverySetupPin}
                    disabled={recoverySetupLoading || unlocking}
                  />
                  <button
                    type="submit"
                    disabled={recoverySetupLoading || unlocking || recoverySetupPin.length < VAULT_PIN_MIN_LENGTH}
                    className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    {recoverySetupLoading || unlocking ? 'Creating…' : 'Create recovery code'}
                  </button>
                </form>

                <div className="my-5 border-t border-bg-border" />

                <form onSubmit={handleChangePinWithRecoveryCode} className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Forgot current PIN?</h3>
                    <p className="text-text-muted text-xs mt-0.5">Use your recovery code to set a new vault PIN.</p>
                  </div>
                  <div>
                    <label htmlFor="pin-recovery-code" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Recovery code
                    </label>
                    <input
                      id="pin-recovery-code"
                      type="text"
                      value={recoveryCodeInput}
                      onChange={e => setRecoveryCodeInput(e.target.value)}
                      required
                      autoComplete="off"
                      inputMode="text"
                      className="password-field w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <PinInput
                    id="settings-recovery-pin"
                    label="New vault PIN"
                    value={recoveryPin}
                    onChange={setRecoveryPin}
                    disabled={pinRecoveryLoading || unlocking}
                  />
                  <PinInput
                    id="settings-recovery-confirm-pin"
                    label="Confirm new vault PIN"
                    value={confirmRecoveryPin}
                    onChange={setConfirmRecoveryPin}
                    disabled={pinRecoveryLoading || unlocking}
                  />
                  <WeakPinWarning message={!validateVaultPin(recoveryPin) ? getWeakPinWarning(recoveryPin) : null} />
                  <button
                    type="submit"
                    disabled={pinRecoveryLoading || unlocking}
                    className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    {pinRecoveryLoading || unlocking ? 'Updating…' : 'Reset PIN with recovery code'}
                  </button>
                </form>

                {oneTimeRecoveryCode && (
                  <div className="mt-4 bg-success/10 border border-success/30 rounded-xl p-3 space-y-2">
                    <p className="text-success text-xs font-semibold">New one-time recovery code</p>
                    <p className="font-mono text-lg tracking-[0.2em] text-text-primary break-all">{oneTimeRecoveryCode}</p>
                    <p className="text-text-muted text-xs">Save this code now. It replaces the previous recovery code.</p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <button
              type="button"
              onClick={() => setOpenSection(s => (s === 'backup' ? '' : 'backup'))}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-bg-elevated/40 transition-colors"
            >
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Backup</h2>
                <p className="text-text-muted text-xs mt-0.5">Export or import all spaces as JSON.</p>
              </div>
              <ChevronDown
                size={16}
                className={`text-text-muted transition-transform ${openSection === 'backup' ? 'rotate-180' : ''}`}
              />
            </button>
            {openSection === 'backup' && (
              <div className="px-4 pb-4">
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
              </div>
            )}
          </section>
        </div>

        <section className="mt-6">
          <button
            type="button"
            onClick={() => {
              signOut()
              toast.info('Signed out')
            }}
            className="w-full px-4 py-3 rounded-xl border border-bg-border bg-bg-surface hover:bg-danger/10 hover:border-danger/30 text-sm font-semibold text-text-secondary hover:text-danger transition-colors"
          >
            Sign out
          </button>
        </section>
      </main>
    </div>
  )
}
