/**
 * ThemeContext.jsx - Dark / light theme toggle for Arche.
 *
 * Persists the user's preference in localStorage under the key
 * `arche-theme`. On mount it reads the stored value (defaulting
 * to "dark") and sets `data-theme` on <html> so CSS custom
 * properties in index.css switch to the correct palette.
 *
 * Exposes:
 *   - `theme`  - current theme string ("dark" | "light")
 *   - `toggle` - function to flip between dark and light
 */

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  // Initialise from localStorage; fall back to dark
  const [theme, setTheme] = useState(
    () => localStorage.getItem('arche-theme') || 'dark'
  )

  // Sync the data-theme attribute and localStorage whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('arche-theme', theme)
  }, [theme])

  /** Flip between dark ↔ light */
  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to access the theme context.
 * Must be used inside a <ThemeProvider>.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
