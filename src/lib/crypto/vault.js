/**
 * vault.js - Per-user vault setup / unlock (Supabase user_encryption row).
 */
import { supabase } from '../supabase'
import { encryptString, decryptString } from './cipher'
import {
  deriveEncryptionKey,
  generateSalt,
  saltToBase64,
  saltFromBase64,
} from './keyDerivation'

const VAULT_CHECK_PLAINTEXT = 'ARCHE_VAULT_V1_OK'

/**
 * Create salt + encrypted verifier for a new user.
 * @param {string} userId
 * @param {string} password
 */
export async function setupUserVault(userId, password) {
  const salt = generateSalt()
  const key = await deriveEncryptionKey(password, salt)
  const keyCheck = await encryptString(VAULT_CHECK_PLAINTEXT, key)

  const { error } = await supabase.from('user_encryption').upsert({
    user_id: userId,
    salt: saltToBase64(salt),
    key_check: keyCheck,
  })
  if (error) throw error
  return key
}

/**
 * Derive key and verify password against stored check.
 * @param {string} userId
 * @param {string} password
 * @returns {Promise<CryptoKey>}
 */
export async function unlockUserVault(userId, password) {
  const { data, error } = await supabase
    .from('user_encryption')
    .select('salt, key_check')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    return setupUserVault(userId, password)
  }

  const salt = saltFromBase64(data.salt)
  const key = await deriveEncryptionKey(password, salt)
  const check = await decryptString(data.key_check, key)
  if (check !== VAULT_CHECK_PLAINTEXT) {
    throw new Error('Incorrect password - cannot unlock your encrypted vault.')
  }
  return key
}

export async function userHasVault(userId) {
  const { data, error } = await supabase
    .from('user_encryption')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return !!data
}
