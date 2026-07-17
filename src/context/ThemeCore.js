import { createContext, useContext } from 'react'

export const THEME_MODES = [
  {
    id: 'system',
    name: 'System',
    description: 'Match this device.',
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Always use dark mode.',
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Always use light mode.',
  },
]

export const ACCENT_COLORS = [
  {
    id: 'mint',
    name: 'Mint Green',
    description: 'Fresh green accent inspired by the Arche Space home page.',
    swatch: '#32d3aa',
  },
  {
    id: 'lavender',
    name: 'Lavender Indigo',
    description: 'The original Arche Space accent, refined.',
    swatch: '#7c6af7',
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    description: 'Warm gold accent with a focused feel.',
    swatch: '#f6b84b',
  },
]

export const DEFAULT_THEME_MODE = 'system'
export const DEFAULT_ACCENT_COLOR = 'mint'

export const ThemeContext = createContext(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
