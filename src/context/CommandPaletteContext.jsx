/**
 * CommandPaletteContext.jsx - Cmd+K command palette state.
 */
import { useState, useCallback, useMemo } from 'react'
import { CommandPaletteContext } from './CommandPaletteCore'

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
