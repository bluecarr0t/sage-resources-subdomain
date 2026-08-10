import { parseStdbUpload } from '@/lib/ai-report-builder/stdb-import';

describe('parseStdbUpload', () => {
  it('parses a simple metric CSV into 60/120/180 rings', async () => {
    const csv = [
      'Metric,60 Min,120 Min,180 Min',
      '2020 Total Population,50000,150000,400000',
      '2020 Total Households,20000,60000,150000',
      'Median Household Income 2025,75000,70000,68000',
    ].join('\n');
    const result = await parseStdbUpload(Buffer.from(csv), 'stdb.csv');
    expect(result.rawRowCount).toBeGreaterThanOrEqual(3);
    expect(result.rings[0].minutes).toBe(60);
    expect(result.rings[0].population_2020).toBe(50000);
    expect(result.rings[1].population_2020).toBe(150000);
    expect(result.rings[2].median_hh_income_2025).toBe(68000);
  });
});
