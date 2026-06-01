import {
  rvOverviewApiDisplayError,
  rvOverviewSupabaseDisplayError,
} from '@/lib/rv-industry-overview/rv-overview-display-error';
import { RV_OVERVIEW_API_ERROR_FALLBACK, RV_OVERVIEW_CHART_ERROR_FALLBACK } from '@/lib/rv-industry-overview/rv-overview-display-error';

describe('rv-overview-display-error', () => {
  it('rvOverviewSupabaseDisplayError redacts connection strings', () => {
    const msg = rvOverviewSupabaseDisplayError(
      new Error('connect failed postgres://admin:pw@host.supabase.co:5432/postgres')
    );
    expect(msg).not.toContain('postgres://');
    expect(msg).not.toContain('pw@');
    expect(msg).not.toMatch(/at\s+Object\./);
  });

  it('rvOverviewApiDisplayError uses API fallback', () => {
    const msg = rvOverviewApiDisplayError('Bearer eyJhbGciOiJIUzI1NiJ9.fake.token');
    expect(msg).toBe(RV_OVERVIEW_API_ERROR_FALLBACK);
    expect(msg).not.toContain('eyJ');
  });
});
