import { describe, it, expect } from 'vitest'
import {
  generateRecoveryCode,
  normalizeRecoveryCode,
  validateRecoveryCode,
  RECOVERY_CODE_LENGTH,
} from './recoveryCode'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

describe('generateRecoveryCode', () => {
  it('has the expected length and charset', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRecoveryCode()
      expect(code).toHaveLength(RECOVERY_CODE_LENGTH)
      for (const ch of code) expect(ALPHABET).toContain(ch)
    }
  })

  it('produces codes that validate', () => {
    expect(validateRecoveryCode(generateRecoveryCode())).toBeNull()
  })

  it('covers the whole alphabet across many draws (no obvious bias/truncation)', () => {
    const seen = new Set()
    for (let i = 0; i < 500; i++) {
      for (const ch of generateRecoveryCode()) seen.add(ch)
    }
    // With 500*12 = 6000 symbols, every one of the 36 should appear.
    expect(seen.size).toBe(ALPHABET.length)
  })
})

describe('normalizeRecoveryCode', () => {
  it('lowercases and strips non-alphanumerics', () => {
    expect(normalizeRecoveryCode('  AB-12 cd_34  ')).toBe('ab12cd34')
  })
  it('handles nullish input', () => {
    expect(normalizeRecoveryCode(null)).toBe('')
    expect(normalizeRecoveryCode(undefined)).toBe('')
  })
})

describe('validateRecoveryCode', () => {
  it('accepts a normalized code of the right length', () => {
    expect(validateRecoveryCode('abcd1234efgh')).toBeNull()
  })
  it('rejects the wrong length', () => {
    expect(validateRecoveryCode('abc')).toBeTruthy()
    expect(validateRecoveryCode('a'.repeat(RECOVERY_CODE_LENGTH + 1))).toBeTruthy()
  })
})
