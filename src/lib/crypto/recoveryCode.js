/**
 * recoveryCode.js - Human-friendly vault recovery codes.
 */

const RECOVERY_CODE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
export const RECOVERY_CODE_LENGTH = 12

export function generateRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_CODE_LENGTH))
  let code = ''
  for (let i = 0; i < bytes.length; i++) {
    code += RECOVERY_CODE_ALPHABET[bytes[i] % RECOVERY_CODE_ALPHABET.length]
  }
  return code
}

export function normalizeRecoveryCode(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function validateRecoveryCode(value) {
  const code = normalizeRecoveryCode(value)
  if (code.length !== RECOVERY_CODE_LENGTH) {
    return `Recovery code must be ${RECOVERY_CODE_LENGTH} lowercase letters or numbers.`
  }
  return null
}
