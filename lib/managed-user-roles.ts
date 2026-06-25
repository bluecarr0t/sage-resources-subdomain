export type ManagedUserRole = 'admin' | 'author';

export const DEFAULT_MANAGED_USER_ROLE: ManagedUserRole = 'author';

export function normalizeManagedUserRole(role: string | null | undefined): ManagedUserRole {
  return role === 'admin' ? 'admin' : 'author';
}

export function resolveManagedUserRole(requested?: string | null): ManagedUserRole {
  return requested === 'admin' ? 'admin' : DEFAULT_MANAGED_USER_ROLE;
}
