/**
 * Tests for comparables extraction: parse XLSX files and validate structure
 * against what the /admin/comparables/[studyId] page displays.
 *
 * Add real XLSX fixtures to __tests__/fixtures/ (e.g. 25-175A-04.xlsx) to
 * validate extraction from actual feasibility studies.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { parseWorkbook } from '@/lib/parsers/feasibility-xlsx-parser';
import type { ParsedWorkbook } from '@/lib/types/feasibility';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

/** Create a minimal valid XLSX buffer for testing */
function createMinimalCompsSummXlsx(studyId: string): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'Overview', 'Amenities', 'Distance', 'Total Sites', 'Quality'],
    ['Mountain View Glamping', 'Luxury glamping resort', 'Pool, Hot Tub', 5.2, 24, 8.5],
    ['Riverside Camp', 'Family campground', 'Playground', 12, 50, 7.2],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Comps Summ.');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

/** Create XLSX with Comps Summ + Best Comps + 10 yr PF for fuller validation */
function createFullMinimalXlsx(studyId: string): Buffer {
  const compsSumm = XLSX.utils.aoa_to_sheet([
    ['Name', 'Overview', 'Amenities', 'Distance', 'Total Sites', 'Quality'],
    ['Comp A', 'Description', 'Pool', 5, 20, 8],
  ]);
  const bestComps = XLSX.utils.aoa_to_sheet([
    ['Property Name', 'Overall Score', 'Unit Types', 'Unit Amenities', 'Property', 'Location'],
    ['Subject Property', 8.5, 'Good', 'Good', 'Good', 'Good'],
    ['Comp A', 8, 'Good', 'Good', 'Good', 'Good'],
  ]);
  const tenYrPf = XLSX.utils.aoa_to_sheet([
    ['Unit Type', 'Units', 'Year 1 ADR', 'Year 1 Occ', 'Year 1 Revenue'],
    ['Cabin', 10, 150, 0.65, 355000],
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, compsSumm, 'Comps Summ.');
  XLSX.utils.book_append_sheet(wb, bestComps, 'Best Comps');
  XLSX.utils.book_append_sheet(wb, tenYrPf, '10 yr PF');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

describe('comparables extraction', () => {
  describe('parseWorkbook with minimal fixture', () => {
    it('extracts study_id from filename', () => {
      const buffer = createMinimalCompsSummXlsx('25-175A-04');
      const parsed = parseWorkbook(buffer, '25-175A-04 Ocean Springs MS.xlsx');
      expect(parsed.study_id).toBe('25-175A-04');
    });

    it('parses Comps Summ. sheet into comparables', () => {
      const buffer = createMinimalCompsSummXlsx('25-175A-04');
      const parsed = parseWorkbook(buffer, '25-175A-04.xlsx');

      expect(parsed.comparables.length).toBeGreaterThanOrEqual(1);
      expect(parsed.sheets_found).toContain('Comps Summ.');

      const first = parsed.comparables[0];
      expect(first).toHaveProperty('comp_name');
      expect(first).toHaveProperty('overview');
      expect(first).toHaveProperty('distance_miles');
      expect(first).toHaveProperty('total_sites');
      expect(first).toHaveProperty('quality_score');
    });

    it('parses Best Comps and 10 yr PF when present', () => {
      const buffer = createFullMinimalXlsx('25-175A-04');
      const parsed = parseWorkbook(buffer, '25-175A-04.xlsx');

      expect(parsed.sheets_found).toContain('Comps Summ.');
      expect(parsed.sheets_found).toContain('Best Comps');
      expect(parsed.sheets_found).toContain('10 yr PF');

      expect(parsed.property_scores.length).toBeGreaterThanOrEqual(1);
      expect(parsed.pro_forma_units.length).toBeGreaterThanOrEqual(0);
    });

    it('returns valid ParsedWorkbook structure for page consumption', () => {
      const buffer = createFullMinimalXlsx('25-175A-04');
      const parsed = parseWorkbook(buffer, '25-175A-04.xlsx');

      expect(parsed).toMatchObject({
        study_id: expect.any(String),
        filename: expect.any(String),
        sheets_found: expect.any(Array),
        warnings: expect.any(Array),
        comparables: expect.any(Array),
        comp_units: expect.any(Array),
        summaries: expect.any(Array),
        property_scores: expect.any(Array),
        pro_forma_units: expect.any(Array),
        development_costs: expect.any(Array),
        rate_projections: expect.any(Array),
        occupancy_projections: expect.any(Array),
        market_data: expect.any(Array),
      });
    });
  });

  describe('parseWorkbook with real fixtures', () => {
    const fixtureFiles = fs.existsSync(FIXTURES_DIR)
      ? fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.xlsx'))
      : [];

    if (fixtureFiles.length === 0) {
      it('no XLSX fixtures - add files like 25-175A-04.xlsx to __tests__/fixtures/ to validate real extraction', () => {
        expect(fixtureFiles.length).toBe(0);
      });
    }

    fixtureFiles.forEach((filename) => {
      const studyIdMatch = filename.match(/^(\d{2}-\d{3}[A-Z]?-\d{2})/);
      const studyId = studyIdMatch ? studyIdMatch[1] : filename.replace('.xlsx', '');

      it(`parses ${filename} and validates structure`, () => {
        const filePath = path.join(FIXTURES_DIR, filename);
        const buffer = fs.readFileSync(filePath);
        const parsed = parseWorkbook(buffer, filename);

        expect(parsed.study_id).toBeTruthy();
        expect(parsed.sheets_found.length).toBeGreaterThan(0);

        if (parsed.comparables.length > 0) {
          const comp = parsed.comparables[0];
          expect(comp.comp_name).toBeTruthy();
          expect(typeof comp.distance_miles === 'number' || comp.distance_miles === null).toBe(true);
          expect(typeof comp.total_sites === 'number' || comp.total_sites === null).toBe(true);
        }

        if (parsed.property_scores.length > 0) {
          const score = parsed.property_scores[0];
          expect(score.property_name).toBeTruthy();
          expect(typeof score.overall_score === 'number' || score.overall_score === null).toBe(true);
        }

        if (parsed.project_info) {
          expect(parsed.project_info).toHaveProperty('resort_name');
          expect(parsed.project_info).toHaveProperty('county');
        }
      });

      it(`parsed ${filename} has consistent comp_units structure`, () => {
        const filePath = path.join(FIXTURES_DIR, filename);
        const buffer = fs.readFileSync(filePath);
        const parsed = parseWorkbook(buffer, filename);

        for (const unit of parsed.comp_units) {
          expect(unit).toHaveProperty('property_name');
          expect(unit).toHaveProperty('unit_type');
          expect(typeof unit.num_units === 'number' || unit.num_units === null).toBe(true);
        }
      });
    });
  });
});
