/**
 * @deprecated Super-viewer access is now `managed_users.pipeline_view_all`.
 * Kept for migration scripts and historical reference only.
 */
const LEGACY_SUPER_VIEWER_LOCAL_PARTS = new Set(['garwood', 'heilala', 'harsell']);

/** @deprecated Use `canViewAllPipelineJobs` from `@/lib/managed-users-pipeline`. */
export function isProjectPipelineSuperViewer(
  email: string | null | undefined
): boolean {
  if (!email) return false;
  const localPart = email.toLowerCase().split('@')[0]?.trim();
  if (!localPart) return false;
  return LEGACY_SUPER_VIEWER_LOCAL_PARTS.has(localPart);
}
