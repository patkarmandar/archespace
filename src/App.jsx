/**
 * App.jsx - Root application component.
 */

import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthProvider, useAuth } from './context/AuthContext'
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

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CollectionPage = lazy(() => import('./pages/CollectionPage'))
const RecycleBinPage = lazy(() => import('./pages/RecycleBinPage'))
const ArchivePage = lazy(() => import('./pages/ArchivePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

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
  if (user) return <Navigate to="/" replace />
  return (
    <Suspense fallback={<PageLoader />}>
      {children}
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

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <PublicRoute><LoginPage /></PublicRoute> },
      { path: '/', element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
      { path: '/collection/:id', element: <ProtectedRoute><CollectionPage /></ProtectedRoute> },
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
