import { supabase } from './supabase'
import { decryptSpaces, decryptItems } from './dataProtection'

/**
 * Fetch and decrypt spaces + items for archive or recycle bin views.
 */
export async function fetchStoredCollection({ spaceQuery, itemQuery, cryptoKey }) {
  const [{ data: spaces, error: e1 }, { data: items, error: e2 }] =
    await Promise.all([
      spaceQuery(supabase.from('spaces').select('*')),
      itemQuery(supabase.from('space_items').select('*')),
    ])
  if (e1) throw e1
  if (e2) throw e2
  return {
    spaces: await decryptSpaces(spaces || [], cryptoKey),
    items: await decryptItems(items || [], cryptoKey),
  }
}
