import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordClientRateLimitFailure,
  getClientRateLimitStatus,
  clearClientRateLimit,
} from './rateLimiter'

// Node environment has no localStorage; provide a minimal in-memory mock.
beforeEach(() => {
  const store = {}
  globalThis.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: k => { delete store[k] },
  }
})

const MAX = 5
const WIN = 60_000

describe('rateLimiter', () => {
  it('blocks after max failures within the window', () => {
    for (let i = 0; i < MAX; i++) recordClientRateLimitFailure('login:a', MAX, WIN)
    expect(getClientRateLimitStatus('login:a', MAX).blocked).toBe(true)
  })

  it('is not blocked before reaching max', () => {
    for (let i = 0; i < MAX - 1; i++) recordClientRateLimitFailure('login:b', MAX, WIN)
    expect(getClientRateLimitStatus('login:b', MAX).blocked).toBe(false)
  })

  it('uses a separate lockout duration when provided', () => {
    for (let i = 0; i < MAX; i++) recordClientRateLimitFailure('login:c', MAX, WIN, 1000)
    expect(getClientRateLimitStatus('login:c', MAX).blocked).toBe(true)
  })

  it('clears a limit', () => {
    for (let i = 0; i < MAX; i++) recordClientRateLimitFailure('login:d', MAX, WIN)
    clearClientRateLimit('login:d')
    expect(getClientRateLimitStatus('login:d', MAX).blocked).toBe(false)
  })
})
