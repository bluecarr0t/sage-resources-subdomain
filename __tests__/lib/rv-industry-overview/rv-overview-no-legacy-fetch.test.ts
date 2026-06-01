import fs from 'fs';
import path from 'path';
import {
  RV_OVERVIEW_FORBIDDEN_CHART_DATA_EXPORTS,
} from '@/lib/rv-industry-overview/rv-overview-chart-data-entrypoint';

const CHART_DATA_DIR = path.join(process.cwd(), 'lib/rv-industry-overview');

describe('RV overview chart-data modules (no legacy fetch/get)', () => {
  const files = fs
    .readdirSync(CHART_DATA_DIR)
    .filter((f) => f.startsWith('campspot-') && f.endsWith('-chart-data.ts'));

  it('finds expected chart-data files', () => {
    expect(files.length).toBeGreaterThanOrEqual(7);
  });

  for (const file of files) {
    it(`${file} does not export legacy fetchCampspot*/getCampspot* scanners`, () => {
      const content = fs.readFileSync(path.join(CHART_DATA_DIR, file), 'utf8');
      for (const prefix of RV_OVERVIEW_FORBIDDEN_CHART_DATA_EXPORTS) {
        expect(content).not.toMatch(
          new RegExp(`export\\s+(async\\s+)?function\\s+${prefix}[A-Za-z]+ChartData`)
        );
        expect(content).not.toMatch(
          new RegExp(`export\\s+(async\\s+)?function\\s+${prefix}[A-Za-z]+PageData`)
        );
      }
    });
  }
});
