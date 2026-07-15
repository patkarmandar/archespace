/**
 * App.jsx - Root application component.
 */

import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useRouteError } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AlertTriangle, RefreshCw } from 'lucide-react'

import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContextCore'
import { EncryptionProvider } from './context/EncryptionContext'
import VaultUnlockGate from './components/VaultUnlockGate'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { CommandPaletteProvider } from './context/CommandPaletteContext'
import { ShortcutsProvider } from './context/ShortcutsContext'
import { PageActionsProvider } from './context/PageActionsContext'
import { useSessionTimeout } from './hooks/useSessionTimeout'

import ErrorBoundary from './components/ErrorBoundary'
import AppChrome from './components/layout/AppChrome'
import { Spinner } from './components/ui/UI'

/**
 * Wrap React.lazy() so that a failed dynamic import (e.g. after a
 * redeployment that changed chunk hashes) triggers one automatic
 * page reload instead of crashing.  A sessionStorage flag prevents
 * infinite reload loops.
 */
function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch((error) => {
      const reloaded = sessionStorage.getItem('chunk_reload')
      if (!reloaded) {
        sessionStorage.setItem('chunk_reload', '1')
        window.location.reload()
        // Return a never-resolving promise so React doesn't render while reloading
        return new Promise(() => {})
      }
      // Already retried once – surface the real error
      sessionStorage.removeItem('chunk_reload')
      throw error
    }),
  )
}

// Clear the flag on a successful page load so future deploys can retry again
sessionStorage.removeItem('chunk_reload')

const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'))
const PasswordResetPage = lazyWithRetry(() => import('./pages/PasswordResetPage'))
const HomePage = lazyWithRetry(() => import('./pages/HomePage'))
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage'))
const SpacePage = lazyWithRetry(() => import('./pages/SpacePage'))
const RecycleBinPage = lazyWithRetry(() => import('./pages/RecycleBinPage'))
const ArchivePage = lazyWithRetry(() => import('./pages/ArchivePage'))
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 30, retry: 1 } },
})

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <Spinner size={24} />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  useSessionTimeout()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return (
    <VaultUnlockGate>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </VaultUnlockGate>
  )
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader />
  if (user) return <Navigate to="/app" replace />
  return (
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
  )
}

function HomeRoute() {
  const { user, loading } = useAuth()

  if (loading) return <PageLoader />
  if (user) return <Navigate to="/app" replace />
  return (
    <Suspense fallback={<PageLoader />}>
      <HomePage />
    </Suspense>
  )
}

/** Shell rendered inside RouterProvider so hooks like useNavigate() work in AppChrome. */
function RootLayout() {
  return (
    <>
      <AppChrome />
      <Outlet />
    </>
  )
}

/** React Router error boundary – renders when a route throws (including chunk-load failures). */
function RouteErrorBoundary() {
  const error = useRouteError()
  console.error('[RouteErrorBoundary]', error)

  const isChunkError =
    error?.message?.includes('dynamically imported module') ||
    error?.message?.includes('Failed to fetch')

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
          {isChunkError
            ? <RefreshCw size={24} style={{ color: 'var(--accent)' }} />
            : <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />}
        </div>

        <h1 className="text-xl font-semibold">
          {isChunkError ? 'App updated - reload needed' : 'Something went wrong'}
        </h1>

        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {isChunkError
            ? 'A new version of Arche was deployed. Please reload to get the latest update.'
            : 'An unexpected error occurred. Try reloading the page or going back to the dashboard.'}
        </p>

        {!isChunkError && error?.message && (
          <details className="text-left text-xs rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--text-secondary)' }}>
              Error details
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-all" style={{ color: 'var(--danger)' }}>
              {error.message}
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

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/login', element: <PublicRoute><LoginPage /></PublicRoute> },
      { path: '/reset-password', element: <Suspense fallback={<PageLoader />}><PasswordResetPage /></Suspense> },
      { path: '/', element: <HomeRoute /> },
      { path: '/app', element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
      { path: '/space/:id', element: <ProtectedRoute><SpacePage /></ProtectedRoute> },
      { path: '/recycle-bin', element: <ProtectedRoute><RecycleBinPage /></ProtectedRoute> },
      { path: '/archive', element: <ProtectedRoute><ArchivePage /></ProtectedRoute> },
      { path: '/settings', element: <ProtectedRoute><SettingsPage /></ProtectedRoute> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <QueryClientProvider client={queryClient}>
            <ShortcutsProvider>
              <CommandPaletteProvider>
                <PageActionsProvider>
                  <AuthProvider>
                    <EncryptionProvider>
                      <RouterProvider router={router} />
                    </EncryptionProvider>
                  </AuthProvider>
                </PageActionsProvider>
              </CommandPaletteProvider>
            </ShortcutsProvider>
          </QueryClientProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
