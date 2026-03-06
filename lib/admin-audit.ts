/**
 * Admin audit logging for uploads, edits, deletes, and downloads.
 * Uses service-role client to bypass RLS (audit logs are append-only).
 */

import { createServerClient } from '@/lib/supabase';

export type AuditAction = 'upload' | 'edit' | 'delete' | 'download' | 're_extract';
export type AuditResourceType = 'report' | 'study';
export type AuditSource = 'session' | 'internal_api';

export interface AuditLogEntry {
  user_id?: string | null;
  user_email?: string | null;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id: string;
  study_id?: string | null;
  details?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  source: AuditSource;
}

function getClientIp(request: Request | null): string | null {
  if (!request) return null;
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || null;
}

function getUserAgent(request: Request | null): string | null {
  if (!request) return null;
  return request.headers.get('user-agent') || null;
}

/**
 * Log an admin action. Fire-and-forget; never throws.
 */
export async function logAdminAudit(
  entry: AuditLogEntry,
  request?: Request | null
): Promise<void> {
  try {
    const supabase = createServerClient();
    await supabase.from('admin_audit_log').insert({
      user_id: entry.user_id ?? null,
      user_email: entry.user_email ?? null,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      study_id: entry.study_id ?? null,
      details: entry.details ?? {},
      ip_address: entry.ip_address ?? getClientIp(request ?? null),
      user_agent: entry.user_agent ?? getUserAgent(request ?? null),
      source: entry.source,
    });
  } catch (err) {
    console.error('[admin-audit] Failed to log:', err);
  }
}
