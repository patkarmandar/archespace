/**
 * PinInput.jsx - Vault secret field: a numeric PIN or an alphanumeric
 * passphrase (letters, numbers, symbols).
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
        inputMode="text"
        maxLength={VAULT_PIN_MAX_LENGTH}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        autoComplete={autoComplete}
        disabled={disabled}
        className={`w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent disabled:opacity-50 ${className}`}
      />
    </div>
  )
}
