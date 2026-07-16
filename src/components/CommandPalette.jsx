/**
 * CommandPalette.jsx - Cmd+K quick actions (⌘K / Ctrl+K).
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Home, Archive, Trash2, Search, Settings, Sparkles, Keyboard,
} from 'lucide-react'
import { useCommandPalette } from '../context/CommandPaletteCore'
import { useTheme } from '../context/ThemeCore'

export default function CommandPalette({ onNewSpace, onOpenSearch }) {
  const { open, closePalette, extraCommands } = useCommandPalette()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const { toggle } = useTheme()

  const baseCommands = useMemo(() => [
    { id: 'new', label: 'New space', hint: 'N', icon: Plus, run: () => { closePalette(); onNewSpace?.() } },
    { id: 'search', label: 'Search', hint: '/', icon: Search, run: () => { closePalette(); onOpenSearch?.() } },
    { id: 'home', label: 'Go to dashboard', icon: Home, run: () => { closePalette(); navigate('/app') } },
    { id: 'archive', label: 'Open archive', icon: Archive, run: () => { closePalette(); navigate('/archive') } },
    { id: 'bin', label: 'Open recycle bin', icon: Trash2, run: () => { closePalette(); navigate('/recycle-bin') } },
    { id: 'settings', label: 'Settings', icon: Settings, run: () => { closePalette(); navigate('/settings') } },
    { id: 'shortcuts', label: 'Keyboard shortcuts', hint: '?', icon: Keyboard, run: () => { closePalette(); window.dispatchEvent(new CustomEvent('arche:open-shortcuts')) } },
    {
      id: 'theme',
      label: 'Switch app theme',
      icon: Sparkles,
      run: () => { toggle(); closePalette() },
    },
  ], [closePalette, navigate, onNewSpace, onOpenSearch, toggle])

  const commands = useMemo(() => [...baseCommands, ...extraCommands], [baseCommands, extraCommands])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(c => c.label.toLowerCase().includes(q))
  }, [commands, query])

  const activeIndex = Math.min(active, Math.max(0, filtered.length - 1))

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closePalette() }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
      if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault()
        filtered[activeIndex].run()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, activeIndex, closePalette])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && closePalette()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-lg bg-bg-surface border border-bg-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type a command…"
          className="w-full px-4 py-3.5 bg-transparent border-b border-bg-border text-text-primary placeholder-text-muted focus:outline-none text-sm"
        />
        <ul className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-text-muted">No commands found</li>
          ) : filtered.map((cmd, i) => {
            const Icon = cmd.icon
            return (
              <li key={cmd.id}>
                <button
                  type="button"
                  onClick={() => cmd.run()}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                    i === activeIndex ? 'bg-accent-muted text-text-primary' : 'text-text-secondary hover:bg-bg-elevated'
                  }`}
                >
                  {Icon && <Icon size={16} className="shrink-0 text-text-muted" />}
                  <span className="flex-1">{cmd.label}</span>
                  {cmd.hint && <kbd className="text-xs text-text-muted font-mono">{cmd.hint}</kbd>}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="px-4 py-2 text-[10px] text-text-muted border-t border-bg-border">
          ↑↓ navigate · Enter run · Esc close
        </p>
      </div>
    </div>
  )
}
