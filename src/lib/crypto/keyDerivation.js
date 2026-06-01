/**
 * keyDerivation.js - Derive AES key from user password (PBKDF2).
 */
import { PBKDF2_ITERATIONS } from '../constants'

export function generateSalt() {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  return salt
}

export function saltToBase64(salt) {
  let binary = ''
  for (let i = 0; i < salt.length; i++) binary += String.fromCharCode(salt[i])
  return btoa(binary)
}

export function saltFromBase64(b64) {
  const binary = atob(b64)
  const salt = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) salt[i] = binary.charCodeAt(i)
  return salt
}

/**
 * @param {string} password
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
export async function deriveEncryptionKey(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}
