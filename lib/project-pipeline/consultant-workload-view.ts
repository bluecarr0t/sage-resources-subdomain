import { isManagedUsersAdminEmail } from '@/lib/managed-users-admin';

export function canUseProjectPipelineConsultantWorkloadView(
  email: string | null | undefined
): boolean {
  return isManagedUsersAdminEmail(email);
}

/** harsell@ sees the toggle beside the author-preview eye; others beside filters. */
export function placePipelineConsultantWorkloadToggleAfterAuthorPreview(
  email: string | null | undefined
): boolean {
  return email?.trim().toLowerCase().startsWith('harsell@') ?? false;
}
