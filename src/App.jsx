/**
 * App.jsx — Root application component.
 *
 * Wraps the routing tree with all necessary providers:
 *   - ErrorBoundary (Catches unhandled render errors)
 *   - ThemeProvider (Dark/light mode)
 *   - ToastProvider (Notifications)
 *   - QueryClientProvider (React Query cache)
 *   - AuthProvider (Supabase authentication)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { useSessionTimeout } from './hooks/useSessionTimeout'

import ErrorBoundary from './components/ErrorBoundary'
import { Spinner } from './components/ui/UI'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CollectionPage from './pages/CollectionPage'
import RecycleBinPage from './pages/RecycleBinPage'

// Configure React Query to hold data for 30s before considering it stale
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 30, retry: 1 } }
})

/**
 * Wrapper for routes that require an authenticated user.
 * Redirects to /login if unauthenticated.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  useSessionTimeout()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <Spinner size={24} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

/**
 * Wrapper for routes that should only be accessible to logged-OUT users.
 * Redirects to dashboard if already authenticated.
 */
function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <Spinner size={24} />
    </div>
  )
  if (user) return <Navigate to="/" replace />
  return children
}

/** Main routing switch */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"            element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/"                 element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/collection/:id"   element={<ProtectedRoute><CollectionPage /></ProtectedRoute>} />
      <Route path="/recycle-bin"      element={<ProtectedRoute><RecycleBinPage /></ProtectedRoute>} />
      {/* Catch-all route -> Dashboard */}
      <Route path="*"                 element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </BrowserRouter>
          </QueryClientProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
