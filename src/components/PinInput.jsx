/**
 * PinInput.jsx - Numeric PIN field (4–12 digits).
 */
import { VAULT_PIN_MAX_LENGTH } from '../lib/constants'

export default function PinInput({
  id,
  label,
  value,
  onChange,
  autoComplete = 'off',
  disabled = false,
  className = '',
}) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={VAULT_PIN_MAX_LENGTH}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        required
        autoComplete={autoComplete}
        disabled={disabled}
        className={`w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-sm tracking-[0.35em] font-mono focus:outline-none focus:border-accent disabled:opacity-50 ${className}`}
      />
    </div>
  )
}
