/** Emails that can open the Admin nav (users + workload management). */
const MANAGED_USERS_ADMIN_EMAIL_PREFIXES = [
  'harsell@',
  'garwood@',
  'heilala@',
] as const;

export function isManagedUsersAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const normalized = email.trim().toLowerCase();
  return MANAGED_USERS_ADMIN_EMAIL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
