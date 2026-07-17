/**
 * Modal.jsx - Accessible overlay dialog primitive.
 *
 * Renders a backdrop + centered panel with:
 *   - role="dialog" + aria-modal + aria-labelledby
 *   - focus moved into the panel on open, restored to the opener on close
 *   - Tab / Shift+Tab focus trap kept within the panel
 *   - Escape to close
 *   - optional click-outside to close (off by default so in-progress,
 *     destructive flows aren't dismissed by a stray click)
 *
 * The panel renders as a <form> when `onSubmit` is provided, otherwise a <div>.
 */
import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusable(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    el => !el.hasAttribute('disabled') && el.getClientRects().length > 0
  )
}

export default function Modal({
  onClose,
  labelledBy,
  panelClassName = '',
  onSubmit,
  closeOnBackdrop = false,
  children,
}) {
  const panelRef = useRef(null)

  useEffect(() => {
    const opener = document.activeElement
    const panel = panelRef.current
    const focusables = getFocusable(panel)
    ;(focusables[0] || panel)?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
        return
      }
      if (e.key !== 'Tab') return
      const items = getFocusable(panel)
      if (items.length === 0) {
        e.preventDefault()
        panel?.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      // Restore focus to whatever opened the dialog.
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [onClose])

  const PanelTag = onSubmit ? 'form' : 'div'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={
        closeOnBackdrop
          ? e => { if (e.target === e.currentTarget) onClose?.() }
          : undefined
      }
    >
      <PanelTag
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onSubmit={onSubmit}
        className={panelClassName}
      >
        {children}
      </PanelTag>
    </div>
  )
}
