/**
 * auditLog.js - Best-effort audit logging (optional table).
 */
import { supabase } from './supabase'

/** @param {{ userId: string, action: string, entityType: string, entityId?: string, details?: object }} entry */
export async function logAudit({ userId, action, entityType, entityId, details = {} }) {
  try {
    await supabase.from('audit_log').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      details,
    })
  } catch {
    // audit_log is optional; never block user actions
  }
}
