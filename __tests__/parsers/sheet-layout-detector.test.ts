/**
 * Unit tests for sheet-layout-detector
 */

import {
  scoreHeaderRow,
  detectHeaderRow,
  inferColumnRoles,
  detectSections,
  inferTableStructure,
  inferBestCompsColumnOrder,
  inferLabelValueLayout,
  type Row,
} from '@/lib/parsers/sheet-layout-detector';
import type { ColumnRoleSchema } from '@/lib/types/feasibility';

describe('sheet-layout-detector', () => {
  describe('scoreHeaderRow', () => {
    it('returns higher score for rows with header keywords', () => {
      const keywords = new Set(['name', 'overview', 'type', 'adr']);
      const headerRow: Row = ['Name', 'Overview', 'Amenities', 'Distance', 'Total Sites', 'Quality'];
      const dataRow: Row = ['Mountain View', 'Luxury glamping resort', 'Pool', 5.2, 24, 8.5];

      const headerScore = scoreHeaderRow(headerRow, keywords);
      const dataScore = scoreHeaderRow(dataRow, keywords);

      expect(headerScore).toBeGreaterThan(dataScore);
    });

    it('returns -1 for blank rows', () => {
      const keywords = new Set(['name']);
      const blankRow: Row = ['', '', ''];
      expect(scoreHeaderRow(blankRow, keywords)).toBe(-1);
    });
  });

  describe('detectHeaderRow', () => {
    it('finds header row with name and overview', () => {
      const keywords = new Set(['name', 'overview', 'amenities', 'type', 'adr']);
      const rows: Row[] = [
        ['Title'],
        ['Name', 'Overview', 'Amenities', 'Distance', 'Total Sites', 'Quality'],
        ['Comp A', 'Description A', 'Pool', 5, 20, 8],
        ['Comp B', 'Description B', 'Spa', 3, 15, 7],
      ];

      const result = detectHeaderRow(rows, keywords);
      expect(result).not.toBeNull();
      expect(result!.rowIndex).toBe(1);
      expect(result!.confidence).toBeGreaterThan(0);
    });

    it('returns null for empty sheet', () => {
      const result = detectHeaderRow([], new Set(['name']));
      expect(result).toBeNull();
    });
  });

  describe('inferColumnRoles', () => {
    const overviewSchema: ColumnRoleSchema[] = [
      { role: 'name', keywords: ['name', 'property'] },
      { role: 'overview', keywords: ['overview', 'description'] },
      { role: 'amenities', keywords: ['amenities'] },
      { role: 'distance', keywords: ['distance'] },
      { role: 'totalSites', keywords: ['total', 'sites', 'units'] },
      { role: 'quality', keywords: ['quality'] },
    ];

    it('maps columns by keyword match', () => {
      const rows: Row[] = [
        ['Name', 'Overview', 'Amenities', 'Distance', 'Total Sites', 'Quality'],
      ];
      const map = inferColumnRoles(rows, 0, overviewSchema);

      expect(map.get('name')).toBe(0);
      expect(map.get('overview')).toBe(1);
      expect(map.get('amenities')).toBe(2);
      expect(map.get('distance')).toBe(3);
      expect(map.get('totalSites')).toBe(4);
      expect(map.get('quality')).toBe(5);
    });

    it('handles reordered columns', () => {
      const rows: Row[] = [
        ['Overview', 'Quality', 'Name', 'Distance', 'Amenities', 'Sites'],
      ];
      const map = inferColumnRoles(rows, 0, overviewSchema);

      expect(map.get('name')).toBe(2);
      expect(map.get('overview')).toBe(0);
    });

    it('resolves conflicts using schema priority', () => {
      const schema: ColumnRoleSchema[] = [
        { role: 'a', keywords: ['score'] },
        { role: 'b', keywords: ['score'] },
      ];
      const rows: Row[] = [['Score', 'Other']];
      const map = inferColumnRoles(rows, 0, schema);
      expect(map.get('a')).toBe(0);
      expect(map.get('b')).toBeUndefined();
    });
  });

  describe('detectSections', () => {
    it('splits on blank rows', () => {
      const rows: Row[] = [
        ['Section 1', 'Header'],
        ['Data', 'Value'],
        ['', ''],
        ['Section 2', 'Header'],
        ['Data2', 'Value2'],
      ];
      const sections = detectSections(rows, []);
      expect(sections.length).toBe(2);
      expect(sections[0]).toEqual({ startRow: 0, endRow: 1, marker: undefined });
      expect(sections[1]).toEqual({ startRow: 3, endRow: 4, marker: undefined });
    });

    it('tags sections with matching markers', () => {
      const rows: Row[] = [
        ['Name', 'Overview'],
        ['A', 'Desc'],
        ['', ''],
        ['Type', 'Low ADR', 'Peak ADR'],
        ['Cabin', 150, 250],
      ];
      const sections = detectSections(rows, ['name', 'overview', 'type', 'adr']);
      expect(sections.length).toBe(2);
      expect(sections[0].marker).toBeDefined();
      expect(sections[1].marker).toBeDefined();
    });
  });

  describe('inferTableStructure', () => {
    it('detects header and data start', () => {
      const keywords = new Set(['name', 'overview']);
      const rows: Row[] = [
        ['Name', 'Overview'],
        ['A', 'Desc A'],
        ['B', 'Desc B'],
      ];
      const result = inferTableStructure(rows, keywords);
      expect(result.hasHeader).toBe(true);
      expect(result.dataStartRow).toBe(1);
      expect(result.headerRowIndex).toBe(0);
      expect(result.numCols).toBe(2);
    });

    it('handles sheet without header keywords', () => {
      const rows: Row[] = [['A', 'B'], ['1', '2']];
      const result = inferTableStructure(rows, new Set());
      expect(result.dataStartRow).toBe(0);
    });
  });

  describe('inferBestCompsColumnOrder', () => {
    it('infers name, score, desc columns from data profile', () => {
      const rows: Row[] = [
        ['Property A', 8.5, 'Description'],
        ['Unit Types', 7, ''],
        ['Property B', 9, ''],
      ];
      const result = inferBestCompsColumnOrder(rows);
      expect(result).not.toBeNull();
      expect(result!.nameCol).toBe(0);
      expect(result!.scoreCol).toBe(1);
    });
  });

  describe('inferLabelValueLayout', () => {
    it('returns labelCol 0, valueCol 1 for standard layout', () => {
      const rows: Row[] = [
        ['Resort Name', 'Mountain View'],
        ['County', 'Sevier'],
      ];
      const result = inferLabelValueLayout(rows);
      expect(result.labelCol).toBe(0);
      expect(result.valueCol).toBe(1);
    });
  });
});
