export function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" style={{color:'var(--accent)'}}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Modal({ title, onClose, children, footer }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-surface border border-bg-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header — always visible */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border shrink-0">
          <h3 className="font-semibold text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {/* Footer — always pinned at bottom when provided */}
        {footer && (
          <div className="px-5 py-4 border-t border-bg-border shrink-0 bg-bg-surface rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
