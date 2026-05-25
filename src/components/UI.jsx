export function Spinner({ size = 16 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      className="animate-spin text-accent"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconButton({ onClick, title, children, danger, className = '' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${
        danger
          ? 'text-text-muted hover:text-danger hover:bg-danger/10'
          : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function Badge({ children, color = 'default' }) {
  const colors = {
    default: 'bg-bg-elevated text-text-secondary',
    accent: 'bg-accent-muted text-accent border border-accent/20',
    success: 'bg-success/10 text-success',
  }
  return (
    <span className={`inline-flex text-xs px-2 py-0.5 rounded-md font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-surface border border-bg-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
          <h3 className="font-medium text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-bg-hover"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
