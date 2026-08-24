/**
 * @jest-environment node
 */

import { assertReportAccess } from '@/lib/report-access';

describe('assertReportAccess', () => {
  const owner = { userId: 'owner-1', role: 'author' as const };
  const otherAuthor = { userId: 'author-2', role: 'author' as const };
  const admin = { userId: 'admin-1', role: 'admin' as const };
  const report = { user_id: 'owner-1' };

  it('returns 404 when the report is missing', () => {
    const result = assertReportAccess(owner, null);
    expect(result).toEqual({ ok: false, status: 404, error: 'Report not found' });
  });

  it('returns 403 when an author is not the owner', () => {
    const result = assertReportAccess(otherAuthor, report);
    expect(result).toEqual({ ok: false, status: 403, error: 'Forbidden' });
  });

  it('allows the owning author', () => {
    expect(assertReportAccess(owner, report)).toEqual({ ok: true });
  });

  it('allows an admin to access another user’s report', () => {
    expect(assertReportAccess(admin, report)).toEqual({ ok: true });
  });
});
