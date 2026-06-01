/**
 * ErrorBoundary.jsx - Catch-all error boundary for Arche.
 *
 * Wraps the entire app so that a runtime crash in any child
 * component shows a friendly recovery screen instead of a blank
 * white page. The user can reload or navigate home.
 */

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  /** React lifecycle - capture the thrown error */
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  /** Log to console so developers can debug */
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
        >
          <div className="max-w-md text-center space-y-4">
            {/* Icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-3xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
            >
              ⚠️
            </div>

            <h1 className="text-xl font-semibold">Something went wrong</h1>

            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              An unexpected error occurred. Try reloading the page or going back to the dashboard.
            </p>

            {/* Error details (collapsed by default) */}
            {this.state.error && (
              <details className="text-left text-xs rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
                <summary className="cursor-pointer font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Error details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-all" style={{ color: 'var(--danger)' }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Recovery actions */}
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                Reload page
              </button>
              <button
                onClick={() => { window.location.href = '/' }}
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

    return this.props.children
  }
}
