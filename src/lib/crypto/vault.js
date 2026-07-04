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
import { bytesFromBase64, bytesToBase64 } from './encoding'

const VAULT_CHECK_PLAINTEXT = 'ARCHE_VAULT_V1_OK'
export const VAULT_FORMAT_PIN_WRAPPED = 'pin_wrapped'

function assertValidPin(pin) {
  const err = validateVaultPin(pin)
  if (err) throw new Error(err)
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
    .select('user_id, salt, key_check, wrapped_key, vault_format, pin_locked_until')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function assertVaultUnlockAllowed(userId) {
  const { data, error } = await supabase.rpc('get_vault_pin_lock_status')
  if (error) {
    // Fallback for projects that have not run the migration yet.
    const meta = await fetchVaultMeta(userId)
    if (meta?.pin_locked_until && new Date(meta.pin_locked_until) > new Date()) {
      const retryAfter = Math.ceil((new Date(meta.pin_locked_until) - Date.now()) / 1000)
      throw new Error(formatPinLockoutMessage(retryAfter))
    }
    return
  }
  if (data?.locked) {
    throw new Error(formatPinLockoutMessage(data.retry_after_seconds || 300))
  }
}

function formatPinLockoutMessage(retryAfterSeconds) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60))
  return `Too many failed PIN attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
}

async function recordVaultUnlockFailure() {
  const { error } = await supabase.rpc('record_vault_pin_unlock_failure')
  if (error) console.warn('Failed to record vault PIN failure:', error.message)
}

async function recordVaultUnlockSuccess() {
  const { error } = await supabase.rpc('record_vault_pin_unlock_success')
  if (error) console.warn('Failed to reset vault PIN attempts:', error.message)
}

function isIncorrectPinError(err) {
  const msg = err?.message || ''
  return msg.includes('Incorrect PIN') || msg.includes('cannot unlock')
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
  await assertVaultUnlockAllowed(userId)
  const meta = await fetchVaultMeta(userId)
  if (!meta) {
    throw new Error('No vault PIN configured. Create a PIN to continue.')
  }
  try {
    const key = await unlockPinWrappedVault(meta, pin)
    await recordVaultUnlockSuccess()
    return key
  } catch (err) {
    if (isIncorrectPinError(err)) {
      await recordVaultUnlockFailure()
    }
    throw err
  }
}


/**
 * Change vault PIN (verifies current PIN first).
 */
export async function changeVaultPinWithVerification(userId, currentPin, newPin) {
  assertValidPin(newPin)
  await assertVaultUnlockAllowed(userId)
  try {
    const meta = await fetchVaultMeta(userId)
    if (!meta) throw new Error('No vault PIN configured.')
    const masterKey = await unlockPinWrappedVault(meta, currentPin)
    await recordVaultUnlockSuccess()
    await persistPinWrappedVault(userId, newPin, masterKey)
    return masterKey
  } catch (err) {
    if (isIncorrectPinError(err)) {
      await recordVaultUnlockFailure()
    }
    throw err
  }
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
    throw new Error('Incorrect PIN - cannot unlock your encrypted vault.')
  }
  return masterKey
}

