/**
 * cipher.js - AES-256-GCM encrypt/decrypt via Web Crypto API.
 */
export const CIPHER_PREFIX = 'arc1:'

function toBase64(bytes) {
  let binary = ''
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
  return btoa(binary)
}

function fromBase64(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(CIPHER_PREFIX)
}

/**
 * @param {string} plaintext
 * @param {CryptoKey} key
 * @returns {Promise<string>}
 */
export async function encryptString(plaintext, key) {
  if (plaintext == null) return ''
  const text = String(plaintext)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  return `${CIPHER_PREFIX}${toBase64(iv)}.${toBase64(ciphertext)}`
}

/**
 * @param {string} value
 * @param {CryptoKey} key
 * @returns {Promise<string>}
 */
export async function decryptString(value, key) {
  if (value == null || value === '') return ''
  if (!isEncrypted(value)) return String(value)
  const body = value.slice(CIPHER_PREFIX.length)
  const dot = body.indexOf('.')
  if (dot < 0) throw new Error('Invalid encrypted payload')
  const iv = fromBase64(body.slice(0, dot))
  const ct = fromBase64(body.slice(dot + 1))
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ct
  )
  return new TextDecoder().decode(plainBuffer)
}

/**
 * @param {unknown} data
 * @param {CryptoKey} key
 */
export async function encryptJson(data, key) {
  return encryptString(JSON.stringify(data ?? null), key)
}

/**
 * @param {string} value
 * @param {CryptoKey} key
 */
export async function decryptJson(value, key) {
  const text = await decryptString(value, key)
  if (!text) return null
  return JSON.parse(text)
}
