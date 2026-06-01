import { sanitizeAdminDisplayError } from '@/lib/admin-display-error';

describe('sanitizeAdminDisplayError', () => {
  it('returns fallback for null/empty', () => {
    expect(sanitizeAdminDisplayError(null, { fallback: 'nope' })).toBe('nope');
    expect(sanitizeAdminDisplayError('', { fallback: 'nope' })).toBe('nope');
  });

  it('includes PostgREST code when present on object', () => {
    expect(
      sanitizeAdminDisplayError({ code: 'PGRST116', message: 'JSON object requested, multiple rows returned' })
    ).toBe('[PGRST116] JSON object requested, multiple rows returned');
  });

  it('strips embedded stack traces', () => {
    expect(
      sanitizeAdminDisplayError('Query failed\n    at Object.<anonymous> (/app/foo.ts:1:1)')
    ).toBe('Query failed');
  });

  it('redacts postgres connection strings', () => {
    const out = sanitizeAdminDisplayError(
      'connect ECONNREFUSED postgres://user:secret@db.example.com:5432/postgres'
    );
    expect(out).not.toContain('secret@');
    expect(out).toContain('[redacted]');
  });

  it('redacts supabase URLs and bearer tokens', () => {
    const out = sanitizeAdminDisplayError(
      'fetch failed https://abc.supabase.co/rest/v1/campspot Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig'
    );
    expect(out).not.toMatch(/eyJ/);
    expect(out).not.toContain('supabase.co/rest');
  });

  it('truncates very long messages', () => {
    const long = 'x'.repeat(400);
    expect(sanitizeAdminDisplayError(long).length).toBeLessThanOrEqual(240);
  });
});
