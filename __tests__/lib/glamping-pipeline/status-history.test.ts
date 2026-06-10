import {
  applyIsOpenChangeWithHistory,
  computeStintDays,
  openInitialPipelineStatusHistory,
} from '@/lib/glamping-pipeline/status-history';

describe('computeStintDays', () => {
  it('counts inclusive days for an open stint', () => {
    expect(computeStintDays('2026-01-01', null, '2026-01-03')).toBe(3);
  });

  it('counts completed stints', () => {
    expect(computeStintDays('2026-01-01', '2026-01-10', '2026-01-15')).toBe(10);
  });

  it('returns 0 for invalid ranges', () => {
    expect(computeStintDays('2026-02-01', '2026-01-01', '2026-02-01')).toBe(0);
  });
});

describe('applyIsOpenChangeWithHistory', () => {
  it('no-ops when is_open is unchanged', async () => {
    const supabase = { from: jest.fn() } as unknown as Parameters<
      typeof applyIsOpenChangeWithHistory
    >[0];

    const result = await applyIsOpenChangeWithHistory(supabase, {
      propertyId: 1,
      slug: 'test-camp',
      previousIsOpen: 'Under Construction',
      nextIsOpen: 'Under Construction',
      changeSource: 'admin_patch',
    });

    expect(result.changed).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('closes prior stint and opens a new one', async () => {
    const updateIs = jest.fn().mockResolvedValue({ error: null });
    const updateEq = jest.fn(() => ({ is: updateIs }));
    const update = jest.fn(() => ({ eq: updateEq }));
    const insert = jest.fn().mockResolvedValue({ error: null });
    const propertyUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const propertyUpdate = jest.fn(() => ({ eq: propertyUpdateEq }));

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'glamping_pipeline_status_history') {
          return { update, insert };
        }
        if (table === 'all_sage_data') {
          return { update: propertyUpdate };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    } as unknown as Parameters<typeof applyIsOpenChangeWithHistory>[0];

    const result = await applyIsOpenChangeWithHistory(supabase, {
      propertyId: 42,
      slug: 'river-camp',
      previousIsOpen: 'Proposed Development',
      nextIsOpen: 'Under Construction',
      asOfDate: '2026-06-10',
      changeSource: 'weekly_pipeline_sync',
      evidenceUrl: 'https://example.com/article',
    });

    expect(result.changed).toBe(true);
    expect(update).toHaveBeenCalledWith({ ended_on: '2026-06-10' });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        property_id: 42,
        slug: 'river-camp',
        is_open: 'Under Construction',
        started_on: '2026-06-10',
        change_source: 'weekly_pipeline_sync',
      })
    );
    expect(propertyUpdate).toHaveBeenCalledWith({
      is_open: 'Under Construction',
      date_updated: '2026-06-10',
    });
  });
});

describe('openInitialPipelineStatusHistory', () => {
  it('inserts the first stint for a new pipeline property', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: jest.fn(() => ({ insert })),
    } as unknown as Parameters<typeof openInitialPipelineStatusHistory>[0];

    await openInitialPipelineStatusHistory(supabase, {
      propertyId: 7,
      slug: 'new-resort',
      isOpen: 'Proposed Development',
      startedOn: '2026-06-10',
      changeSource: 'weekly_pipeline_sync',
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        property_id: 7,
        is_open: 'Proposed Development',
        started_on: '2026-06-10',
      })
    );
  });
});
