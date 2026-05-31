/**
 * ToastContext.jsx — Lightweight notification system for Arche.
 *
 * Provides a `useToast()` hook that exposes a `toast` function.
 * Usage:
 *   const { toast } = useToast()
 *   toast.success('Collection created')
 *   toast.error('Import failed')
 *
 * Toasts auto-dismiss after 3 seconds and stack vertically in the
 * bottom-right corner. Max 5 visible at once (oldest removed first).
 */

import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

/** Maximum number of visible toasts at once */
const MAX_TOASTS = 5

/** Auto-dismiss delay in milliseconds */
const DISMISS_MS = 3000

/** Icon + accent colour per toast type */
const TYPE_CONFIG = {
  success: { Icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  error:   { Icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20'     },
  info:    { Icon: Info,          color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20'    },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  /** Remove a single toast by id */
  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  /**
   * Show a toast notification.
   * @param {'success'|'error'|'info'} type
   * @param {string} message
   */
  const show = useCallback((type, message) => {
    const id = crypto.randomUUID()

    setToasts(prev => {
      // Trim oldest if we're at the limit
      const trimmed = prev.length >= MAX_TOASTS ? prev.slice(1) : prev
      return [...trimmed, { id, type, message }]
    })

    // Auto-dismiss after delay
    setTimeout(() => dismiss(id), DISMISS_MS)
  }, [dismiss])

  /** Convenience methods */
  const toast = {
    success: (msg) => show('success', msg),
    error:   (msg) => show('error', msg),
    info:    (msg) => show('info', msg),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* ── Toast stack (bottom-right, fixed) ── */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map(({ id, type, message }) => {
          const { Icon, color, bg, border } = TYPE_CONFIG[type] || TYPE_CONFIG.info
          return (
            <div
              key={id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border ${border} ${bg} shadow-xl backdrop-blur-md animate-slide-in`}
              style={{ background: 'var(--bg-surface)', borderColor: undefined }}
            >
              <Icon size={18} className={`${color} shrink-0`} />
              <span className="flex-1 text-sm text-text-primary">{message}</span>
              <button
                onClick={() => dismiss(id)}
                className="shrink-0 p-1 rounded-lg text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Inline keyframes for slide-in animation */}
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.2s ease-out; }
      `}</style>
    </ToastContext.Provider>
  )
}

/**
 * Hook to access the toast notification system.
 * @returns {{ toast: { success: Function, error: Function, info: Function } }}
 */
export const useToast = () => useContext(ToastContext)
