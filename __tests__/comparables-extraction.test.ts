/**
 * Tests for comparables extraction: parse XLSX files and validate structure
 * against what the /admin/comps/[studyId] page displays.
 *
 * Add real XLSX fixtures to __tests__/fixtures/ (e.g. 25-175A-04.xlsx) to
 * validate extraction from actual feasibility studies.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { parseWorkbook } from '@/lib/parsers/feasibility-xlsx-parser';
import { syntheticComparablesFromPropertyScores } from '@/lib/parsers/best-comps-to-comparables';
import type { ParsedPropertyScore, ParsedWorkbook } from '@/lib/types/feasibility';

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
  describe('syntheticComparablesFromPropertyScores', () => {
    it('maps non-subject scores to ParsedComparable with overview and state', () => {
      const scores: ParsedPropertyScore[] = [
        {
          property_name: 'Subject Property',
          overall_score: 9,
          is_subject: true,
          unit_types_score: null,
          unit_types_description: null,
          unit_amenities_score: null,
          unit_amenities_description: null,
          property_score: null,
          property_description: null,
          property_amenities_score: null,
          property_amenities_description: null,
          location_score: null,
          location_description: null,
          brand_strength_score: null,
          brand_strength_description: null,
          occupancy_notes: null,
        },
        {
          property_name: 'Hidden Waters RV Park',
          overall_score: 8.5,
          is_subject: false,
          unit_types_score: null,
          unit_types_description: 'Full hookup',
          unit_amenities_score: null,
          unit_amenities_description: null,
          property_score: null,
          property_description: null,
          property_amenities_score: null,
          property_amenities_description: null,
          location_score: null,
          location_description: 'Robbinsville, NC',
          brand_strength_score: null,
          brand_strength_description: null,
          occupancy_notes: null,
        },
      ];
      const warnings: string[] = [];
      const comps = syntheticComparablesFromPropertyScores(scores, warnings);
      expect(comps).toHaveLength(1);
      expect(comps[0].comp_name).toBe('Hidden Waters RV Park');
      expect(comps[0].quality_score).toBe(8.5);
      expect(comps[0].state).toBe('NC');
      expect(comps[0].overview).toContain('Robbinsville');
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('dedupes by normalized property name', () => {
      const scores: ParsedPropertyScore[] = [
        {
          property_name: 'Same Park',
          overall_score: 7,
          is_subject: false,
          unit_types_score: null,
          unit_types_description: 'Short',
          unit_amenities_score: null,
          unit_amenities_description: null,
          property_score: null,
          property_description: null,
          property_amenities_score: null,
          property_amenities_description: null,
          location_score: null,
          location_description: null,
          brand_strength_score: null,
          brand_strength_description: null,
          occupancy_notes: null,
        },
        {
          property_name: 'Same Park*',
          overall_score: 8,
          is_subject: false,
          unit_types_score: null,
          unit_types_description: 'Longer description wins richness',
          unit_amenities_score: null,
          unit_amenities_description: null,
          property_score: null,
          property_description: 'Extra',
          property_amenities_description: null,
          property_amenities_score: null,
          location_score: null,
          location_description: null,
          brand_strength_score: null,
          brand_strength_description: null,
          occupancy_notes: null,
        },
      ];
      const comps = syntheticComparablesFromPropertyScores(scores);
      expect(comps).toHaveLength(1);
      expect(comps[0].quality_score).toBe(8);
    });
  });

  /** Real 2023-style workbooks (Best Comps, no Comps Summ.) live under local_data/ (gitignored). */
  const LOCAL_2023_XLSX = path.join(
    process.cwd(),
    'local_data/past_reports/2023/23-6304A-12 Robbinsville, NC RV FS.xlsx'
  );

  describe('parseWorkbook legacy 2023-style (local_data)', () => {
    if (!fs.existsSync(LOCAL_2023_XLSX)) {
      it('skips when local_data 2023 XLSX is absent (add file to run integration check)', () => {
        expect(fs.existsSync(LOCAL_2023_XLSX)).toBe(false);
      });
    } else {
      it('synthesizes comparables from Best Comps for real 2023 workbook', () => {
        const buffer = fs.readFileSync(LOCAL_2023_XLSX);
        const parsed = parseWorkbook(buffer, '23-6304A-12 Robbinsville, NC RV FS.xlsx');

        expect(parsed.sheets_found).toContain('Best Comps');
        expect(parsed.property_scores.length).toBeGreaterThan(0);
        expect(parsed.comparables.length).toBeGreaterThan(0);
        expect(parsed.comparables.every((c) => !/^subject/i.test(c.comp_name))).toBe(true);
        expect(parsed.warnings.some((w) => /Best Comps/i.test(w) && /Comps Summ/i.test(w))).toBe(true);
      });
    }
  });

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
      expect(first).toHaveProperty('state');
      expect(first).toHaveProperty('distance_miles');
      expect(first).toHaveProperty('total_sites');
      expect(first).toHaveProperty('quality_score');
    });

    it('extracts state and formats overview when overview contains location', () => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['Name', 'Overview', 'Amenities', 'Distance', 'Total Sites', 'Quality'],
        ['Onera Wimberley', 'Wimberley, TX. Luxury cabins', 'Pool', 5, 20, 8],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Comps Summ.');
      const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
      const parsed = parseWorkbook(buffer, '25-175A-04.xlsx');

      expect(parsed.comparables.length).toBe(1);
      const comp = parsed.comparables[0];
      expect(comp.state).toBe('TX');
      expect(comp.overview).toMatch(/Location:\s*Wimberley,\s*TX/);
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
