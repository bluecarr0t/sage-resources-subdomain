/**
 * @jest-environment node
 */

const mockRpc = jest.fn();
const mockSelectNot = jest.fn();

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => mockSelectNot(),
        }),
      }),
    }),
  })),
}));

describe('countVerifiedGatedLeads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('prefers the SECURITY DEFINER RPC total', async () => {
    mockRpc.mockResolvedValue({ data: 12, error: null });
    const { createServerClient } = await import('@/lib/supabase');
    const { countVerifiedGatedLeads } = await import(
      '@/lib/gated-content-signup-count'
    );

    const result = await countVerifiedGatedLeads(
      createServerClient(),
      'glamping-market-overview'
    );

    expect(mockRpc).toHaveBeenCalledWith('count_verified_gated_leads', {
      p_page_slug: 'glamping-market-overview',
    });
    expect(mockSelectNot).not.toHaveBeenCalled();
    expect(result).toEqual({ count: 12, error: null });
  });

  it('falls back to select length when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'fn missing' } });
    mockSelectNot.mockResolvedValue({
      data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      count: 1,
      error: null,
    });
    const { createServerClient } = await import('@/lib/supabase');
    const { countVerifiedGatedLeads } = await import(
      '@/lib/gated-content-signup-count'
    );

    const result = await countVerifiedGatedLeads(
      createServerClient(),
      'glamping-market-overview'
    );

    // Row length wins over a bad Content-Range header (1).
    expect(result).toEqual({ count: 3, error: null });
  });
});

describe('rankVerifiedGatedLead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('prefers the SECURITY DEFINER rank RPC', async () => {
    mockRpc.mockResolvedValue({ data: 16, error: null });
    const { createServerClient } = await import('@/lib/supabase');
    const { rankVerifiedGatedLead } = await import(
      '@/lib/gated-content-signup-count'
    );

    const result = await rankVerifiedGatedLead(
      createServerClient(),
      'glamping-market-overview',
      'terrawhitellc@gmail.com'
    );

    expect(mockRpc).toHaveBeenCalledWith('rank_verified_gated_lead', {
      p_page_slug: 'glamping-market-overview',
      p_email: 'terrawhitellc@gmail.com',
    });
    expect(result).toEqual({ rank: 16, error: null });
  });
});
