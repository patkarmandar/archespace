/**
 * queryInvalidation.js - Shared TanStack Query invalidation helpers.
 */

function invalidateKeys(qc, keys) {
  keys.forEach(queryKey => qc.invalidateQueries({ queryKey }))
}

export function invalidateSpaceCollections(qc) {
  invalidateKeys(qc, [
    ['spaces'],
    ['bin'],
    ['archive'],
    ['space-stats'],
    ['global-search-data'],
    ['items'],
  ])
}

export function invalidateSpaceList(qc) {
  invalidateKeys(qc, [
    ['spaces'],
    ['global-search-data'],
  ])
}

export function invalidateSpaceItems(qc, spaceId) {
  invalidateKeys(qc, [
    spaceId ? ['items', spaceId] : ['items'],
    ['bin'],
    ['archive'],
    ['space-stats'],
    ['global-search-data'],
  ])
}

export function invalidateArchive(qc) {
  invalidateKeys(qc, [
    ['archive'],
    ['spaces'],
    ['items'],
    ['space-stats'],
    ['global-search-data'],
  ])
}

export function invalidateRecycleBin(qc) {
  invalidateKeys(qc, [
    ['bin'],
    ['spaces'],
    ['items'],
    ['space-stats'],
    ['global-search-data'],
  ])
}
