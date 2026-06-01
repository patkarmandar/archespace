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
  useShortcut('new-collection', () => pageActionsRef.current.onNewCollection?.(), !!user)
  useShortcut('save', () => window.dispatchEvent(new CustomEvent('arche:flush-saves')), !!user)
  useShortcut('escape', () => pageActionsRef.current.onEscape?.(), !!user)

  useEffect(() => {
    const onExpired = (e) => {
      const reason = e.detail?.reason === 'absolute'
        ? 'Session limit reached. Please sign in again.'
        : 'Signed out due to inactivity.'
      toast.info(reason)
    }
    window.addEventListener('arche:session-expired', onExpired)
    return () => window.removeEventListener('arche:session-expired', onExpired)
  }, [toast])

  if (!user) return null

  return (
    <CommandPalette
      onNewCollection={() => pageActionsRef.current.onNewCollection?.()}
      onExport={() => pageActionsRef.current.onExport?.()}
      onOpenSearch={() => pageActionsRef.current.onOpenSearch?.()}
    />
  )
}
