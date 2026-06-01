/**
 * vaultSession.js - Persist unlocked vault across page refresh (sessionStorage).
 *
 * Cleared on manual lock, sign-out, or 24-hour vault auto-lock.
 */
import { VAULT_AUTO_LOCK_MS } from '../constants'
import { exportRawAesKey, importRawAesKey } from './vault'

export const VAULT_UNLOCKED_AT_KEY = 'arche:vault-unlocked-at'
const VAULT_SESSION_KEY = 'arche:vault-session-key'
const VAULT_SESSION_USER = 'arche:vault-session-user'

function bytesToBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function bytesFromBase64(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function clearVaultSession() {
  sessionStorage.removeItem(VAULT_UNLOCKED_AT_KEY)
  sessionStorage.removeItem(VAULT_SESSION_KEY)
  sessionStorage.removeItem(VAULT_SESSION_USER)
}

export async function saveVaultSession(userId, cryptoKey) {
  const raw = await exportRawAesKey(cryptoKey)
  sessionStorage.setItem(VAULT_SESSION_USER, userId)
  sessionStorage.setItem(VAULT_SESSION_KEY, bytesToBase64(raw))
  sessionStorage.setItem(VAULT_UNLOCKED_AT_KEY, String(Date.now()))
}

/**
 * @param {string} userId
 * @returns {Promise<CryptoKey|null>}
 */
export async function loadVaultSession(userId) {
  if (sessionStorage.getItem(VAULT_SESSION_USER) !== userId) return null

  const unlockedAt = Number(sessionStorage.getItem(VAULT_UNLOCKED_AT_KEY))
  if (!unlockedAt || Date.now() - unlockedAt > VAULT_AUTO_LOCK_MS) {
    clearVaultSession()
    return null
  }

  const b64 = sessionStorage.getItem(VAULT_SESSION_KEY)
  if (!b64) return null

  try {
    return await importRawAesKey(bytesFromBase64(b64))
  } catch {
    clearVaultSession()
    return null
  }
}
