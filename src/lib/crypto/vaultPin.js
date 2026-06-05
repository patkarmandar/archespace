/**
 * vaultPin.js - Vault PIN validation (4–12 digits).
 */
import { VAULT_PIN_MAX_LENGTH, VAULT_PIN_MIN_LENGTH } from '../constants'

const PIN_DIGITS_ONLY = /^\d+$/

/**
 * @param {string} pin
 * @returns {string|null} Error message or null if valid
 */
export function validateVaultPin(pin) {
  const value = String(pin ?? '')
  if (!PIN_DIGITS_ONLY.test(value)) {
    return 'PIN must contain only digits.'
  }
  if (value.length < VAULT_PIN_MIN_LENGTH || value.length > VAULT_PIN_MAX_LENGTH) {
    return `PIN must be ${VAULT_PIN_MIN_LENGTH}–${VAULT_PIN_MAX_LENGTH} digits.`
  }
  return null
}
