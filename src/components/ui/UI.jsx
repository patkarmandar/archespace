/**
 * UI.jsx - Shared presentational components for Arche.
 *
 * Exports:
 *   - Spinner - Animated SVG loading indicator
 *   - Modal   - Full-screen overlay with header, scrollable body,
 *               and optional pinned footer. Closes on backdrop
 *               click or Escape key.
 */

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Animated loading spinner.
 * @param {{ size?: number }} props - Diameter in px (default 16)
 */
export function Spinner({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin text-accent"
    >
      {/* Background ring */}
      <circle
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="2" strokeOpacity="0.2"
      />
      {/* Spinning arc */}
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Modal dialog overlay.
 *
 * Features:
 *   - Closes when clicking the backdrop (outside the card)
 *   - Closes on Escape key
 *   - Responsive: bottom-sheet on mobile, centered card on desktop
 *   - Optional `footer` prop for sticky action buttons
 *
 * @param {{ title: string, onClose: Function, children: React.ReactNode, footer?: React.ReactNode }} props
 */
export function Modal({ title, onClose, children, footer }) {
  const titleId = useId()
  const panelRef = useRef(null)

  // ── Escape key handler ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Focus the dialog panel when opened
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  // Prevent background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-bg-surface border border-bg-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[90vh] outline-none"
      >
        {/* Header - always visible */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border shrink-0">
          <h3 id={titleId} className="font-semibold text-text-primary">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {/* Footer - pinned at bottom when provided */}
        {footer && (
          <div className="px-5 py-4 border-t border-bg-border shrink-0 bg-bg-surface rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
