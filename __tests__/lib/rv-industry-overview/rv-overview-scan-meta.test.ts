import {
  buildSourceScanMeta,
  rvOverviewScanMetaAnyHitCap,
} from '@/lib/rv-industry-overview/rv-overview-scan-meta';

describe('rvOverviewScanMeta', () => {
  it('detects any hit cap', () => {
    expect(
      rvOverviewScanMetaAnyHitCap({
        campspot: buildSourceScanMeta(400_000, 400_000, true),
        roverpass: buildSourceScanMeta(100, 250_000, false),
      })
    ).toBe(true);
    expect(
      rvOverviewScanMetaAnyHitCap({
        campspot: buildSourceScanMeta(100, 400_000, false),
        roverpass: buildSourceScanMeta(100, 250_000, false),
      })
    ).toBe(false);
  });
});
