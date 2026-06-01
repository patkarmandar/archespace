/**
 * CommandPaletteContext.jsx - Cmd+K command palette state.
 */
import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const CommandPaletteContext = createContext(null)

export function CommandPaletteProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [extraCommands, setExtraCommands] = useState([])

  const registerCommands = useCallback((commands) => {
    setExtraCommands(commands)
    return () => setExtraCommands([])
  }, [])

  const value = useMemo(() => ({
    open,
    setOpen,
    openPalette: () => setOpen(true),
    closePalette: () => setOpen(false),
    extraCommands,
    registerCommands,
  }), [open, extraCommands, registerCommands])

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) throw new Error('useCommandPalette must be used within CommandPaletteProvider')
  return ctx
}
