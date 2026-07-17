/**
 * keyDerivation.js - Derive an AES key from a vault secret.
 *
 * New vaults use Argon2id (memory-hard). Existing vaults created with
 * PBKDF2 keep working: the stored salt is self-describing, so
 * deriveVaultKey() routes legacy values (a plain base64 salt) to PBKDF2 and
 * tagged values ("argon2id$...") to Argon2id.
 */
import { argon2idAsync } from '@noble/hashes/argon2.js'
import { PBKDF2_ITERATIONS } from '../constants'

// Argon2id parameters (OWASP-aligned minimum): 19 MiB, 2 passes, 1 lane.
const ARGON2 = { tag: 'argon2id', m: 19456, t: 2, p: 1, dkLen: 32 }

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
 * Salt descriptor for a NEW vault (Argon2id), self-describing so unlock
 * knows the KDF + params: "argon2id$<m>$<t>$<p>$<saltB64>".
 * @returns {string}
 */
export function newSaltDescriptor() {
  return `${ARGON2.tag}$${ARGON2.m}$${ARGON2.t}$${ARGON2.p}$${saltToBase64(generateSalt())}`
}

async function importAesKey(rawBytes) {
  return crypto.subtle.importKey('raw', rawBytes, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

/**
 * Derive the AES-GCM wrapping key from a secret using the KDF described by
 * `descriptor` (the stored `salt` / `recovery_salt` value).
 * @param {string} secret
 * @param {string} descriptor - Argon2id descriptor, or a legacy base64 salt.
 * @returns {Promise<CryptoKey>}
 */
export async function deriveVaultKey(secret, descriptor) {
  const str = String(descriptor)
  if (str.startsWith(ARGON2.tag + '$')) {
    const [, m, t, p, saltB64] = str.split('$')
    const raw = await argon2idAsync(new TextEncoder().encode(secret), saltFromBase64(saltB64), {
      m: Number(m), t: Number(t), p: Number(p), dkLen: ARGON2.dkLen,
    })
    return importAesKey(raw)
  }
  // Legacy PBKDF2 vaults: the descriptor is a plain base64 salt.
  return deriveEncryptionKey(secret, saltFromBase64(str))
}

/**
 * Legacy PBKDF2 derivation, kept so existing vaults still unlock.
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
