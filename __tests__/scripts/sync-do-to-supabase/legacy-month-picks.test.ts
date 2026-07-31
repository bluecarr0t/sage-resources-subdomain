import {
  pickBestScrapePerMonth,
  type ScrapeDayCounts,
} from '../../../scripts/sync-do-to-supabase/legacy-month-picks';

function day(
  partial: Omit<ScrapeDayCounts, 'scrapeDate'> & { scrapeDate: string }
): ScrapeDayCounts {
  return { ...partial, scrapeDate: new Date(partial.scrapeDate) };
}

describe('pickBestScrapePerMonth', () => {
  it('picks highest sites+average score per month', () => {
    const rows = [
      day({ id: 1, ym: '2024-01', scrapeDate: '2024-01-10', sitesN: 100, averageN: 50, listingsN: 10 }),
      day({ id: 2, ym: '2024-01', scrapeDate: '2024-01-31', sitesN: 20, averageN: 10, listingsN: 5 }),
      day({ id: 3, ym: '2024-02', scrapeDate: '2024-02-15', sitesN: 200, averageN: 100, listingsN: 20 }),
    ];
    const picks = pickBestScrapePerMonth(rows);
    expect(picks).toHaveLength(2);
    expect(picks[0]).toMatchObject({ ym: '2024-01', dateUpdateId: 1, score: 150 });
    expect(picks[1]).toMatchObject({ ym: '2024-02', dateUpdateId: 3, score: 300 });
  });

  it('tie-breaks to later scrape date, then higher id', () => {
    const rows = [
      day({ id: 10, ym: '2023-12', scrapeDate: '2023-12-14', sitesN: 50, averageN: 50, listingsN: 1 }),
      day({ id: 20, ym: '2023-12', scrapeDate: '2023-12-31', sitesN: 50, averageN: 50, listingsN: 1 }),
      day({ id: 21, ym: '2023-12', scrapeDate: '2023-12-31', sitesN: 50, averageN: 50, listingsN: 1 }),
    ];
    const picks = pickBestScrapePerMonth(rows);
    expect(picks).toHaveLength(1);
    expect(picks[0]?.dateUpdateId).toBe(21);
  });

  it('prefers fuller mid-month scrape over empty month-end', () => {
    const rows = [
      day({ id: 36, ym: '2023-12', scrapeDate: '2023-12-14', sitesN: 86386, averageN: 67293, listingsN: 16138 }),
      day({ id: 53, ym: '2023-12', scrapeDate: '2023-12-31', sitesN: 0, averageN: 59074, listingsN: 0 }),
    ];
    const picks = pickBestScrapePerMonth(rows);
    expect(picks[0]?.dateUpdateId).toBe(36);
    expect(picks[0]?.score).toBe(86386 + 67293);
  });

  it('returns empty array for empty input', () => {
    expect(pickBestScrapePerMonth([])).toEqual([]);
  });
});
