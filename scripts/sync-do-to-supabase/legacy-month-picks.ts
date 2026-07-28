/**
 * Pure ranking helper: pick the fullest scrape day per calendar month.
 * Score = sites_n + average_n; tie-break later scrape_date, then higher id.
 */

export type ScrapeDayCounts = {
  id: number;
  /** Calendar month key YYYY-MM */
  ym: string;
  scrapeDate: Date;
  sitesN: number;
  averageN: number;
  listingsN: number;
};

export type MonthPick = {
  ym: string;
  dateUpdateId: number;
  scrapeDate: Date;
  sitesN: number;
  averageN: number;
  listingsN: number;
  score: number;
};

function scoreOf(row: ScrapeDayCounts): number {
  return row.sitesN + row.averageN;
}

function compareBest(a: ScrapeDayCounts, b: ScrapeDayCounts): number {
  const scoreDiff = scoreOf(b) - scoreOf(a);
  if (scoreDiff !== 0) return scoreDiff;
  const dateDiff = b.scrapeDate.getTime() - a.scrapeDate.getTime();
  if (dateDiff !== 0) return dateDiff;
  return b.id - a.id;
}

/** Returns one pick per ym, sorted by ym ascending. */
export function pickBestScrapePerMonth(rows: ScrapeDayCounts[]): MonthPick[] {
  const byMonth = new Map<string, ScrapeDayCounts[]>();
  for (const row of rows) {
    const list = byMonth.get(row.ym);
    if (list) list.push(row);
    else byMonth.set(row.ym, [row]);
  }

  const picks: MonthPick[] = [];
  for (const ym of [...byMonth.keys()].sort()) {
    const list = byMonth.get(ym)!;
    const best = [...list].sort(compareBest)[0]!;
    picks.push({
      ym,
      dateUpdateId: best.id,
      scrapeDate: best.scrapeDate,
      sitesN: best.sitesN,
      averageN: best.averageN,
      listingsN: best.listingsN,
      score: scoreOf(best),
    });
  }
  return picks;
}
