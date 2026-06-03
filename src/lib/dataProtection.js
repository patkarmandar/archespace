/**
 * dataProtection.js - Encrypt/decrypt spaces & items for storage.
 *
 * Sensitive fields are encrypted client-side before Supabase.
 * Only ciphertext is stored server-side; decryption requires the user's vault key.
 */
import { encryptString, decryptString, encryptJson, decryptJson, isEncrypted } from './crypto/cipher'
import { parseTags } from './spaceColors'

// ── Spaces ─────────────────────────────────────────────

export async function encryptSpace(row, key) {
  if (!key || !row) return row
  const tags = parseTags(row.tags)
  return {
    ...row,
    name: await encryptString(row.name ?? '', key),
    description: await encryptString(row.description ?? '', key),
    tags: await encryptJson(tags, key),
  }
}

export async function decryptSpace(row, key) {
  if (!row) return row
  if (!key) {
    if (row.name && isEncrypted(row.name)) {
      throw new Error('Vault is locked - enter your password to view this data.')
    }
    return { ...row, tags: parseTags(row.tags) }
  }

  let tags = row.tags
  if (typeof tags === 'string' && isEncrypted(tags)) {
    tags = await decryptJson(tags, key)
  } else if (Array.isArray(tags)) {
    tags = parseTags(tags)
  } else {
    tags = parseTags(tags)
  }

  return {
    ...row,
    name: await decryptString(row.name ?? '', key),
    description: await decryptString(row.description ?? '', key),
    tags,
  }
}

export async function decryptSpaces(rows, key) {
  if (!rows?.length) return []
  return Promise.all(rows.map(r => decryptSpace(r, key)))
}

export async function encryptSpaces(rows, key) {
  if (!rows?.length || !key) return rows
  return Promise.all(rows.map(r => encryptSpace(r, key)))
}

// ── Space items ────────────────────────────────────────

export async function encryptItem(row, key) {
  if (!key || !row) return row
  return {
    ...row,
    title: await encryptString(row.title ?? '', key),
    content: await encryptJson(row.content ?? {}, key),
  }
}

export async function decryptItem(row, key) {
  if (!row) return row
  if (!key) {
    if (row.title && isEncrypted(row.title)) {
      throw new Error('Vault is locked - enter your password to view this data.')
    }
    return row
  }

  let content = row.content
  if (typeof content === 'string' && isEncrypted(content)) {
    content = await decryptJson(content, key)
  } else if (typeof content === 'string') {
    try {
      content = JSON.parse(content)
    } catch {
      content = {}
    }
  }

  return {
    ...row,
    title: await decryptString(row.title ?? '', key),
    content: content ?? {},
  }
}

export async function decryptItems(rows, key) {
  if (!rows?.length) return []
  return Promise.all(rows.map(r => decryptItem(r, key)))
}

export async function encryptItems(rows, key) {
  if (!rows?.length || !key) return rows
  return Promise.all(rows.map(r => encryptItem(r, key)))
}
