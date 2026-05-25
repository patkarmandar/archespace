import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Lock } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-muted border border-accent/20 mb-5">
            <span className="text-2xl font-semibold text-accent">A</span>
          </div>
          <h1 className="text-3xl font-semibold text-text-primary tracking-tight">Arche</h1>
          <p className="text-text-secondary text-sm mt-1">Your private workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-bg-surface border border-bg-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-bg-surface border border-bg-border rounded-xl px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors text-sm"
            />
          </div>

          {error && (
            <p className="text-danger text-xs px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Lock size={14} />
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-text-muted text-xs mt-8">
          Single-user private workspace
        </p>
      </div>
    </div>
  )
}
