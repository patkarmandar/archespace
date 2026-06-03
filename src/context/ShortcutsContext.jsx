/**
 * ShortcutsContext.jsx - Global keyboard shortcut registry.
 */
import { createContext, useContext, useEffect, useRef, useCallback } from 'react'

const ShortcutsContext = createContext(null)

export function ShortcutsProvider({ children }) {
  const handlersRef = useRef(new Map())

  const register = useCallback((id, handler) => {
    handlersRef.current.set(id, handler)
    return () => handlersRef.current.delete(id)
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target
      const tag = target?.tagName?.toLowerCase()
      const isTyping = tag === 'input' || tag === 'textarea' || target?.isContentEditable

      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key === 'k') {
        e.preventDefault()
        handlersRef.current.get('palette')?.()
        return
      }

      if (e.key === 'Escape') {
        handlersRef.current.get('escape')?.()
        return
      }

      if (isTyping && !mod) return

      if (mod && e.key === 's') {
        e.preventDefault()
        handlersRef.current.get('save')?.()
        return
      }

      if (e.key === '/' && !mod) {
        e.preventDefault()
        handlersRef.current.get('search')?.()
        return
      }

      if (e.key === 'n' && !mod && !e.shiftKey) {
        const fn = handlersRef.current.get('new-space')
        if (fn) {
          e.preventDefault()
          fn()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <ShortcutsContext.Provider value={{ register }}>
      {children}
    </ShortcutsContext.Provider>
  )
}

export function useShortcuts() {
  const ctx = useContext(ShortcutsContext)
  if (!ctx) throw new Error('useShortcuts must be used within ShortcutsProvider')
  return ctx
}

/** Register a shortcut handler for the lifetime of a component. */
export function useShortcut(id, handler, enabled = true) {
  const { register } = useShortcuts()
  useEffect(() => {
    if (!enabled || !handler) return
    return register(id, handler)
  }, [id, handler, enabled, register])
}
