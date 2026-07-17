import { describe, it, expect } from 'vitest'
import { validateVaultPin, getWeakPinWarning } from './vaultPin'

describe('validateVaultPin', () => {
  it('rejects too short', () => expect(validateVaultPin('123')).toBeTruthy())
  it('accepts a 4-char PIN', () => expect(validateVaultPin('1234')).toBeNull())
  it('accepts an alphanumeric passphrase', () => expect(validateVaultPin('correct horse')).toBeNull())
  it('rejects over max length', () => expect(validateVaultPin('a'.repeat(65))).toBeTruthy())
})

describe('getWeakPinWarning', () => {
  it('warns on a short numeric PIN', () => expect(getWeakPinWarning('1234')).toBeTruthy())
  it('warns on a short passphrase', () => expect(getWeakPinWarning('ab12')).toBeTruthy())
  it('does not warn on a strong passphrase', () => expect(getWeakPinWarning('correct horse battery')).toBeNull())
  it('does not warn on an 8+ digit PIN', () => expect(getWeakPinWarning('12345678')).toBeNull())
})
