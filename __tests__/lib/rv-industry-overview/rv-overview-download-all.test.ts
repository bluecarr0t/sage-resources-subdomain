import {
  runRvOverviewChartDownload,
  summarizeDownloadAll,
  type RvOverviewDownloadChartOutcome,
} from '@/lib/rv-industry-overview/rv-overview-download-all';

describe('summarizeDownloadAll', () => {
  it('counts exported, skipped, and failed outcomes', () => {
    const outcomes: RvOverviewDownloadChartOutcome[] = [
      { key: 'trends', label: 'Trends', status: 'exported' },
      { key: 'regionalMap', label: 'Map', status: 'failed', error: 'blank' },
      { key: 'resortSize', label: 'Size', status: 'skipped' },
    ];
    expect(summarizeDownloadAll(outcomes)).toEqual({
      exported: 1,
      skipped: 1,
      failed: 1,
      outcomes,
    });
  });
});

describe('runRvOverviewChartDownload', () => {
  it('returns error when ref is null', async () => {
    await expect(runRvOverviewChartDownload(null)).resolves.toEqual({
      ok: false,
      error: 'Chart is not mounted',
    });
  });

  it('delegates to handle downloadJpeg', async () => {
    const downloadJpeg = jest.fn().mockResolvedValue({ ok: true });
    await expect(
      runRvOverviewChartDownload({ downloadJpeg })
    ).resolves.toEqual({ ok: true });
    expect(downloadJpeg).toHaveBeenCalledTimes(1);
  });
});
