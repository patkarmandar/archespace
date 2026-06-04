/**
 * vault.js - Per-user vault setup / unlock (Supabase user_encryption row).
 *
 * New vaults use a random master key wrapped with a PIN-derived key.
 */
import { supabase } from '../supabase'
import { encryptString, decryptString } from './cipher'
import {
  deriveEncryptionKey,
  generateSalt,
  saltToBase64,
  saltFromBase64,
} from './keyDerivation'
import { validateVaultPin } from './vaultPin'

const VAULT_CHECK_PLAINTEXT = 'ARCHE_VAULT_V1_OK'
export const VAULT_FORMAT_PIN_WRAPPED = 'pin_wrapped'

function assertValidPin(pin) {
  const err = validateVaultPin(pin)
  if (err) throw new Error(err)
}

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

export async function importRawAesKey(rawBytes) {
  return crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function exportRawAesKey(key) {
  const buf = await crypto.subtle.exportKey('raw', key)
  return new Uint8Array(buf)
}

async function generateMasterKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * @param {string} userId
 * @returns {Promise<{ hasVault: boolean }>}
 */
export async function getVaultStatus(userId) {
  const meta = await fetchVaultMeta(userId)
  if (!meta) return { hasVault: false }
  return {
    hasVault: true,
  }
}

/**
 * @param {string} userId
 */
async function fetchVaultMeta(userId) {
  const { data, error } = await supabase
    .from('user_encryption')
    .select('user_id, salt, key_check, wrapped_key, vault_format')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}


/**
 * Create a new PIN-protected vault for a new user.
 * @param {string} userId
 * @param {string} pin
 */
export async function setupUserVault(userId, pin) {
  assertValidPin(pin)
  const masterKey = await generateMasterKey()
  await persistPinWrappedVault(userId, pin, masterKey)
  return masterKey
}

/**
 * Unlock with vault PIN.
 * @param {string} userId
 * @param {string} pin
 */
export async function unlockUserVault(userId, pin) {
  assertValidPin(pin)
  const meta = await fetchVaultMeta(userId)
  if (!meta) {
    throw new Error('No vault PIN configured. Create a PIN to continue.')
  }
  return unlockPinWrappedVault(meta, pin)
}


/**
 * Change vault PIN (verifies current PIN first).
 */
export async function changeVaultPinWithVerification(userId, currentPin, newPin) {
  assertValidPin(newPin)
  const masterKey = await unlockUserVault(userId, currentPin)
  await persistPinWrappedVault(userId, newPin, masterKey)
  return masterKey
}

async function persistPinWrappedVault(userId, pin, masterKey) {
  const pinSalt = generateSalt()
  const pinKey = await deriveEncryptionKey(pin, pinSalt)
  const raw = await exportRawAesKey(masterKey)
  const wrappedKey = await encryptString(bytesToBase64(raw), pinKey)
  const keyCheck = await encryptString(VAULT_CHECK_PLAINTEXT, masterKey)

  const { error } = await supabase.from('user_encryption').upsert({
    user_id: userId,
    salt: saltToBase64(pinSalt),
    key_check: keyCheck,
    wrapped_key: wrappedKey,
    vault_format: VAULT_FORMAT_PIN_WRAPPED,
  })
  if (error) throw error
}

async function unlockPinWrappedVault(meta, pin) {
  const pinSalt = saltFromBase64(meta.salt)
  const pinKey = await deriveEncryptionKey(pin, pinSalt)
  const rawB64 = await decryptString(meta.wrapped_key, pinKey)
  const masterKey = await importRawAesKey(bytesFromBase64(rawB64))
  const check = await decryptString(meta.key_check, masterKey)
  if (check !== VAULT_CHECK_PLAINTEXT) {
    throw new Error('Incorrect PIN — cannot unlock your encrypted vault.')
  }
  return masterKey
}

