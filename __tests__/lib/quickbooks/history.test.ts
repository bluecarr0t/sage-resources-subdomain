import { resolveRemapHistoryAction } from '@/lib/quickbooks/history';

describe('quickbooks remap history action resolution', () => {
  it('records updated actions', () => {
    expect(
      resolveRemapHistoryAction({ updated: true, error: undefined }, false)
    ).toBe('updated');
  });

  it('records dry-run matches', () => {
    expect(
      resolveRemapHistoryAction({ updated: false, error: undefined }, true)
    ).toBe('matched_dry_run');
  });

  it('records errors except non-matching webhook probes', () => {
    expect(
      resolveRemapHistoryAction({ updated: false, error: 'QBO timeout' }, false)
    ).toBe('error');
    expect(
      resolveRemapHistoryAction(
        {
          updated: false,
          error: 'Invoice does not match INV- + Appraisal Review criteria',
        },
        false
      )
    ).toBeNull();
  });
});
