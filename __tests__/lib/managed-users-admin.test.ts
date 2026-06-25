import { isManagedUsersAdminEmail } from '@/lib/managed-users-admin';

describe('isManagedUsersAdminEmail', () => {
  it('allows harsell, garwood, and heilala on any domain', () => {
    expect(isManagedUsersAdminEmail('harsell@sageoutdooradvisory.com')).toBe(true);
    expect(isManagedUsersAdminEmail('garwood@sagecommercialadvisory.com')).toBe(true);
    expect(isManagedUsersAdminEmail('heilala@sageoutdooradvisory.com')).toBe(true);
  });

  it('rejects other users', () => {
    expect(isManagedUsersAdminEmail('marran@sageoutdooradvisory.com')).toBe(false);
    expect(isManagedUsersAdminEmail(null)).toBe(false);
  });
});
