/**
 * @jest-environment node
 */
import { assertToolRole } from '@/lib/sage-ai/require-tool-role';

describe('assertToolRole', () => {
  it('allows admin to run an admin-only tool', () => {
    expect(
      assertToolRole({ toolName: 'build_feasibility_brief', userRole: 'admin' }, 'admin')
    ).toBeNull();
  });

  it('denies an author from an admin-only tool with an error envelope', () => {
    const res = assertToolRole(
      { toolName: 'build_feasibility_brief', userRole: 'author' },
      'admin'
    );
    expect(res).not.toBeNull();
    expect(res?.data).toBeNull();
    expect(res?.error).toMatch(/requires role=admin/i);
    expect(res?.error).toMatch(/current role=author/i);
  });

  it('treats a missing/null role as author (least privilege)', () => {
    expect(assertToolRole({ toolName: 'x', userRole: null }, 'admin')).not.toBeNull();
    expect(assertToolRole({ toolName: 'x' }, 'admin')).not.toBeNull();
    // ...but an author-level tool is fine for an unknown role.
    expect(assertToolRole({ toolName: 'x', userRole: null }, 'author')).toBeNull();
  });

  it('allows author to run an author-level tool, and admin too', () => {
    expect(assertToolRole({ toolName: 'x', userRole: 'author' }, 'author')).toBeNull();
    expect(assertToolRole({ toolName: 'x', userRole: 'admin' }, 'author')).toBeNull();
  });
});
