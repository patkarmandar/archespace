/**
 * buildInfo.js - Build provenance injected at compile time (see vite.config.js).
 *
 * Surfacing the commit hash lets users verify the code their browser is
 * running matches the audited, open-source release.
 */
/* global __BUILD_HASH__, __BUILD_TIME__ */

export const BUILD_HASH = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev'
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : ''

export const REPO_URL = 'https://github.com/patkarmandar/Arche'
export const COMMIT_URL = BUILD_HASH === 'dev' ? REPO_URL : `${REPO_URL}/commit/${BUILD_HASH}`
