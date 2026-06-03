/**
 * AppChrome.jsx - Global UI shell (palette, session toasts, offline sync).
 */
import { useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useCommandPalette } from '../../context/CommandPaletteContext'
import { useShortcut } from '../../context/ShortcutsContext'
import { useOfflineSync } from '../../hooks/useOfflineSync'
import CommandPalette from '../CommandPalette'

import { usePageActions } from '../../context/PageActionsContext'

export default function AppChrome() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { openPalette } = useCommandPalette()
  const pageActions = usePageActions()
  const pageActionsRef = useRef(pageActions)
  pageActionsRef.current = pageActions

  useOfflineSync()

  useShortcut('palette', () => openPalette(), !!user)
  useShortcut('search', () => pageActionsRef.current.onOpenSearch?.(), !!user)
  useShortcut('new-space', () => pageActionsRef.current.onNewSpace?.(), !!user)
  useShortcut('save', () => window.dispatchEvent(new CustomEvent('arche:flush-saves')), !!user)
  useShortcut('escape', () => pageActionsRef.current.onEscape?.(), !!user)

  useEffect(() => {
    const onExpired = () => {
      toast.info('Session expired after one week. Please sign in again.')
    }
    const onVaultLocked = () => {
      toast.info('Vault locked after 24 hours. Enter your PIN to unlock.')
    }
    window.addEventListener('arche:session-expired', onExpired)
    window.addEventListener('arche:vault-auto-locked', onVaultLocked)
    return () => {
      window.removeEventListener('arche:session-expired', onExpired)
      window.removeEventListener('arche:vault-auto-locked', onVaultLocked)
    }
  }, [toast])

  if (!user) return null

  return (
    <CommandPalette
      onNewSpace={() => pageActionsRef.current.onNewSpace?.()}
      onOpenSearch={() => pageActionsRef.current.onOpenSearch?.()}
    />
  )
}
