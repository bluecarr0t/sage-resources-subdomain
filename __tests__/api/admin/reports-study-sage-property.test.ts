/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/admin/reports/study/[studyId]/route';

const mockResolveSageDataAnchorId = jest.fn();
const mockLogAdminAudit = jest.fn();

jest.mock('@/lib/require-admin-auth', () => ({
  withAdminAuth:
    (handler: (req: NextRequest, auth: unknown, ctx: unknown) => Promise<Response>) =>
    async (req: NextRequest, ctx: unknown) =>
      handler(req, { supabase: mockSupabase, session: { user: { id: 'u1', email: 'a@test.com' } } }, ctx),
}));

jest.mock('@/lib/admin-audit', () => ({
  logAdminAudit: (...args: unknown[]) => mockLogAdminAudit(...args),
}));

jest.mock('@/lib/admin/resolve-sage-data-anchor-id', () => {
  const actual = jest.requireActual<typeof import('@/lib/admin/resolve-sage-data-anchor-id')>(
    '@/lib/admin/resolve-sage-data-anchor-id'
  );
  return {
    ...actual,
    resolveSageDataAnchorId: (...args: unknown[]) => mockResolveSageDataAnchorId(...args),
  };
});

const mockMaybeSingle = jest.fn();
const mockSingle = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

const mockSupabase = {
  from: (...args: unknown[]) => mockFrom(...args),
};

function setupSupabaseMocks() {
  mockMaybeSingle.mockReset();
  mockSingle.mockReset();
  mockUpdate.mockReset();
  mockEq.mockReset();
  mockSelect.mockReset();
  mockFrom.mockReset();

  mockFrom.mockImplementation((table: string) => {
    if (table === 'reports') {
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: mockMaybeSingle,
                }),
              }),
            }),
          }),
        }),
        update: (updates: unknown) => {
          mockUpdate(updates);
          return {
            eq: () => ({
              select: () => ({
                single: mockSingle,
              }),
            }),
          };
        },
      };
    }
    if (table === 'all_sage_data') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 99,
                property_name: 'Linked Property',
                is_open: 'Under Construction',
              },
              error: null,
            }),
          }),
        }),
      };
    }
    return {};
  });
}

describe('PATCH /api/admin/reports/study/[studyId] sage_data_anchor_id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSupabaseMocks();
    mockLogAdminAudit.mockResolvedValue(undefined);
    mockMaybeSingle.mockResolvedValue({ data: { id: 'report-uuid-1' }, error: null });
  });

  it('unlinks when sage_data_anchor_id is null', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'report-uuid-1', study_id: '26-100A-01', sage_data_anchor_id: null },
      error: null,
    });

    const req = new NextRequest('http://localhost/api/admin/reports/study/26-100A-01', {
      method: 'PATCH',
      body: JSON.stringify({ sage_data_anchor_id: null }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ studyId: '26-100A-01' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ sage_data_anchor_id: null });
    expect(mockResolveSageDataAnchorId).not.toHaveBeenCalled();
  });

  it('links when sage_data_anchor_id resolves to anchor', async () => {
    mockResolveSageDataAnchorId.mockResolvedValue({ ok: true, anchorId: 42 });
    mockSingle.mockResolvedValue({
      data: { id: 'report-uuid-1', study_id: '26-100A-01', sage_data_anchor_id: 42 },
      error: null,
    });

    const req = new NextRequest('http://localhost/api/admin/reports/study/26-100A-01', {
      method: 'PATCH',
      body: JSON.stringify({ sage_data_anchor_id: 55 }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ studyId: '26-100A-01' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockResolveSageDataAnchorId).toHaveBeenCalledWith(mockSupabase, 55);
    expect(mockUpdate).toHaveBeenCalledWith({ sage_data_anchor_id: 42 });
  });

  it('rejects invalid sage_data_anchor_id resolution', async () => {
    mockResolveSageDataAnchorId.mockResolvedValue({
      ok: false,
      error: 'Sage property not found',
      status: 404,
    });

    const req = new NextRequest('http://localhost/api/admin/reports/study/26-100A-01', {
      method: 'PATCH',
      body: JSON.stringify({ sage_data_anchor_id: 99999 }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ studyId: '26-100A-01' }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Sage property not found');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
