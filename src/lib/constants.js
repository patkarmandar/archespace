/**
 * constants.js - Shared constants for Arche.
 *
 * Centralises magic numbers and configuration values so they
 * can be tuned from a single location.
 */

// ── Auth & Session ─────────────────────────────────────────
/** Max failed login attempts before cooldown */
export const MAX_LOGIN_ATTEMPTS = 5

/** Cooldown duration after max login attempts (ms) */
export const LOGIN_COOLDOWN_MS = 30_000

/** Inactivity timeout before auto-logout (ms) - 2 hours */
export const SESSION_INACTIVITY_MS = 2 * 60 * 60 * 1000

/** Absolute maximum session lifetime (ms) - 24 hours */
export const SESSION_ABSOLUTE_MAX_MS = 24 * 60 * 60 * 1000

// ── Import / Export ────────────────────────────────────────
/** Maximum import file size in bytes (10 MB) */
export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024

/** Maximum number of collections per import */
export const MAX_IMPORT_COLLECTIONS = 500

/** Maximum number of items per collection in an import */
export const MAX_IMPORT_ITEMS_PER_COLLECTION = 1000

// ── Item Types ─────────────────────────────────────────────
/** Allowed item type values (must match DB CHECK constraint) */
export const ITEM_TYPES = ['textbox', 'checkbox_list', 'menu_list', 'card_list']

// ── UI ─────────────────────────────────────────────────────
/** Auto-save debounce delay (ms) */
export const AUTO_SAVE_DELAY_MS = 2000

/** Toast auto-dismiss delay (ms) */
export const TOAST_DISMISS_MS = 3000

/** Maximum visible toasts */
export const MAX_TOASTS = 5

// ── Field Limits (match DB constraints) ────────────────────
export const MAX_NAME_LENGTH = 255
export const MAX_DESCRIPTION_LENGTH = 2000
export const MAX_TITLE_LENGTH = 255
