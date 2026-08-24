/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/reports/study/[studyId]/download-docx/route';
import { getManagedUser } from '@/lib/auth-helpers';

const mockGetManagedUser = getManagedUser as jest.MockedFunction<typeof getManagedUser>;

let sessionUserId = 'author-1';
let reportRow: Record<string, unknown> | null = {
  id: 'report-1',
  user_id: 'owner-9',
  study_id: '26-100A-01',
  docx_file_path: 'report-1/report.docx',
  narrative_file_path: null,
};

jest.mock('@/lib/require-admin-auth', () => ({
  withAdminAuth:
    (handler: (req: NextRequest, auth: unknown, ctx: unknown) => Promise<Response>) =>
    async (req: NextRequest, ctx: unknown) =>
      handler(
        req,
        {
          supabase: {},
          session: { user: { id: sessionUserId, email: 'a@test.com' } },
        },
        ctx
      ),
}));

jest.mock('@/lib/auth-helpers', () => ({
  getManagedUser: jest.fn(),
}));

jest.mock('@/lib/admin-audit', () => ({
  logAdminAudit: jest.fn(async () => undefined),
}));

jest.mock('@/lib/supabase', () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: reportRow, error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        download: async () => ({
          data: new Blob(['docx-bytes'], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
          error: null,
        }),
      }),
    },
  }),
}));

describe('GET /api/admin/reports/study/[studyId]/download-docx access', () => {
  beforeEach(() => {
    sessionUserId = 'author-1';
    reportRow = {
      id: 'report-1',
      user_id: 'owner-9',
      study_id: '26-100A-01',
      docx_file_path: 'report-1/report.docx',
      narrative_file_path: null,
    };
  });

  it('returns 403 when an author downloads another user’s report', async () => {
    mockGetManagedUser.mockResolvedValue({
      role: 'author',
      user_id: 'author-1',
    } as Awaited<ReturnType<typeof getManagedUser>>);

    const req = new NextRequest('http://localhost/api/admin/reports/study/26-100A-01/download-docx');
    const res = await GET(req, { params: Promise.resolve({ studyId: '26-100A-01' }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });

  it('returns 200 when an admin downloads another user’s report', async () => {
    sessionUserId = 'admin-1';
    mockGetManagedUser.mockResolvedValue({
      role: 'admin',
      user_id: 'admin-1',
    } as Awaited<ReturnType<typeof getManagedUser>>);

    const req = new NextRequest('http://localhost/api/admin/reports/study/26-100A-01/download-docx');
    const res = await GET(req, { params: Promise.resolve({ studyId: '26-100A-01' }) });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('26-100A-01-report.docx');
  });
});
