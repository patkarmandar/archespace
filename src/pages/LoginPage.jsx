/**
 * LoginPage.jsx — Authentication screen.
 *
 * Allows users to sign in with their email and password.
 * Arche is designed as a private workspace, so there is no
 * public registration form (users must be invited/created via Supabase).
 *
 * Security features:
 *   - Client-side rate limiting (5 attempts → 30s cooldown)
 *   - Password visibility toggle
 *   - Staggered entrance animations
 */

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Lock, Sun, Moon, Eye, EyeOff } from 'lucide-react'
import { MAX_LOGIN_ATTEMPTS, LOGIN_COOLDOWN_MS } from '../lib/constants'

export default function LoginPage() {
  const { signIn } = useAuth()
  const { theme, toggle } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Rate limiting state ──
  const [attempts, setAttempts] = useState(0)
  const [cooldownEnd, setCooldownEnd] = useState(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const cooldownTimer = useRef(null)

  // ── Cooldown countdown ──
  useEffect(() => {
    if (!cooldownEnd) {
      setCooldownRemaining(0)
      return
    }

    const tick = () => {
      const remaining = Math.max(0, cooldownEnd - Date.now())
      setCooldownRemaining(remaining)
      if (remaining <= 0) {
        setCooldownEnd(null)
        setAttempts(0)
        clearInterval(cooldownTimer.current)
      }
    }

    tick()
    cooldownTimer.current = setInterval(tick, 1000)
    return () => clearInterval(cooldownTimer.current)
  }, [cooldownEnd])

  const isCoolingDown = cooldownRemaining > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isCoolingDown || loading) return

    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      setError(error.message)

      // Trigger cooldown after max attempts
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        setCooldownEnd(Date.now() + LOGIN_COOLDOWN_MS)
        setError(`Too many failed attempts. Please wait ${Math.ceil(LOGIN_COOLDOWN_MS / 1000)} seconds.`)
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-[0.03] blur-3xl animate-float-slow"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
        />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full opacity-[0.03] blur-3xl animate-float-slow-reverse"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
        />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="absolute top-4 right-4 p-2.5 rounded-xl border border-bg-border bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all z-10"
        title="Toggle theme"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        {/* Logo area */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              <path d="M8 7h6" />
              <path d="M8 11h8" />
            </svg>
          </div>
          <h1 className="text-4xl font-semibold text-text-primary tracking-widest mb-2">ARCHE</h1>
          <p className="text-text-muted text-sm">Your private workspace</p>
        </div>

        {/* Login card */}
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 shadow-xl shadow-black/10">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isCoolingDown}
                className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isCoolingDown}
                  className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 pr-11 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 animate-shake">
                <p className="text-danger text-xs">{error}</p>
              </div>
            )}

            {/* Cooldown indicator */}
            {isCoolingDown && (
              <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                <p className="text-amber-400 text-xs">
                  Try again in {Math.ceil(cooldownRemaining / 1000)}s
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isCoolingDown}
              className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-1 active:scale-[0.98] shadow-lg shadow-accent/20"
            >
              <Lock size={14} />
              {loading ? 'Signing in…' : isCoolingDown ? 'Locked' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-text-muted text-xs mt-6">
          Single-user · Private · Encrypted
        </p>
      </div>
    </div>
  )
}
