/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

const mockGetManagedUser = jest.fn();
const mockUpdate = jest.fn();
const mockSelectSingle = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/require-admin-auth', () => ({
  withAdminAuth:
    (handler: (req: NextRequest, auth: unknown) => Promise<Response>) =>
    async (req: NextRequest) =>
      handler(req, {
        session: { user: { id: 'user-1', email: 'harsell@sageoutdooradvisory.com' } },
      }),
}));

jest.mock('@/lib/auth-helpers', () => ({
  getManagedUser: (...args: unknown[]) => mockGetManagedUser(...args),
}));

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

describe('PATCH /api/admin/account/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetManagedUser.mockResolvedValue({
      id: 42,
      user_id: 'user-1',
      email: 'harsell@sageoutdooradvisory.com',
      role: 'admin',
      is_project_manager: true,
      pipeline_email_preferences: {
        submitForReview: true,
        resubmitForReview: true,
        pmReviewStatusChange: true,
        pmDueDateChange: true,
        reviewStatusChange: true,
        dueDateChange: true,
      },
    });
    mockEq.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: mockSelectSingle,
      }),
    });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockSelectSingle.mockResolvedValue({
      data: {
        pipeline_email_preferences: {
          submitForReview: true,
          resubmitForReview: true,
          pmReviewStatusChange: true,
          pmDueDateChange: false,
          reviewStatusChange: true,
          dueDateChange: false,
        },
      },
      error: null,
    });
  });

  it('updates only the authenticated user preferences', async () => {
    const { PATCH } = await import('@/app/api/admin/account/notifications/route');
    const req = new NextRequest('http://localhost/api/admin/account/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ dueDateChange: false }),
    });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('managed_users');
    expect(mockEq).toHaveBeenCalledWith('id', 42);
    expect(body.pipeline_email_preferences.dueDateChange).toBe(false);
  });

  it('rejects invalid preference payloads', async () => {
    const { PATCH } = await import('@/app/api/admin/account/notifications/route');
    const req = new NextRequest('http://localhost/api/admin/account/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ dueDateChange: 'no' }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects project-manager preferences for consultant-only users', async () => {
    mockGetManagedUser.mockResolvedValue({
      id: 42,
      user_id: 'user-1',
      email: 'marran@sageoutdooradvisory.com',
      role: 'author',
      is_project_manager: false,
      pipeline_email_preferences: {
        submitForReview: true,
        resubmitForReview: true,
        pmReviewStatusChange: true,
        pmDueDateChange: true,
        reviewStatusChange: true,
        dueDateChange: true,
      },
    });

    const { PATCH } = await import('@/app/api/admin/account/notifications/route');
    const req = new NextRequest('http://localhost/api/admin/account/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ submitForReview: false }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetManagedUser.mockResolvedValue({
      email: 'harsell@sageoutdooradvisory.com',
      display_name: 'Nick Harsell',
      role: 'admin',
      is_project_manager: true,
      pipeline_email_preferences: {
        submitForReview: true,
        resubmitForReview: true,
        pmReviewStatusChange: true,
        pmDueDateChange: true,
        reviewStatusChange: true,
        dueDateChange: true,
      },
    });
  });

  it('returns account profile and preferences', async () => {
    const { GET } = await import('@/app/api/admin/account/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.email).toBe('harsell@sageoutdooradvisory.com');
    expect(body.role).toBe('admin');
    expect(body.is_project_manager).toBe(true);
    expect(body.pipeline_email_preferences.dueDateChange).toBe(true);
  });
});
