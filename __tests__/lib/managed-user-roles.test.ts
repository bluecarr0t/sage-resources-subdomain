import {
  DEFAULT_MANAGED_USER_ROLE,
  normalizeManagedUserRole,
  resolveManagedUserRole,
} from '@/lib/managed-user-roles';

describe('managed-user-roles', () => {
  it('defaults new users to author', () => {
    expect(DEFAULT_MANAGED_USER_ROLE).toBe('author');
    expect(resolveManagedUserRole(undefined)).toBe('author');
    expect(resolveManagedUserRole('editor')).toBe('author');
  });

  it('allows promoting any user to admin when requested', () => {
    expect(resolveManagedUserRole('admin')).toBe('admin');
    expect(resolveManagedUserRole('admin')).toBe('admin');
  });

  it('normalizes legacy user/editor roles to author', () => {
    expect(normalizeManagedUserRole('user')).toBe('author');
    expect(normalizeManagedUserRole('editor')).toBe('author');
    expect(normalizeManagedUserRole('admin')).toBe('admin');
  });
});
