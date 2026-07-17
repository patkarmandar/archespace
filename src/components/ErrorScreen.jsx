/**
 * ErrorScreen.jsx - Shared full-page error / recovery UI.
 *
 * Used by both the React error boundary (ErrorBoundary) and the router error
 * boundary (RouteErrorBoundary in App.jsx). The `chunk` variant swaps the icon
 * and is used when a stale dynamic import fails after a redeploy.
 */

import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ErrorScreen({ variant = 'error', title, message, errorMessage }) {
  const isChunk = variant === 'chunk'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <div className="max-w-md text-center space-y-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
        >
          {isChunk
            ? <RefreshCw size={24} style={{ color: 'var(--accent)' }} />
            : <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />}
        </div>

        <h1 className="text-xl font-semibold">{title}</h1>

        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>

        {errorMessage && (
          <details className="text-left text-xs rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--text-secondary)' }}>
              Error details
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-all" style={{ color: 'var(--danger)' }}>
              {errorMessage}
            </pre>
          </details>
        )}

        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Reload page
          </button>
          <button
            onClick={() => { window.location.href = '/app' }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}
          >
            Go to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
