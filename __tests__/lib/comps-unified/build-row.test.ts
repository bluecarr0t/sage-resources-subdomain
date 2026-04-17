import {
  UNIFIED_SOURCES,
  UNIFIED_SORT_COLUMNS,
  filterUnifiedSources,
  isUnifiedSource,
  unifiedSourceBadgeClass,
  unifiedSourceLabel,
} from '@/lib/comps-unified/build-row';

describe('comps-unified/build-row', () => {
  describe('UNIFIED_SOURCES', () => {
    it('contains the five expected sources in fixed order', () => {
      expect(UNIFIED_SOURCES).toEqual([
        'reports',
        'all_glamping_properties',
        'hipcamp',
        'campspot',
        'all_roverpass_data_new',
      ]);
    });
  });

  describe('isUnifiedSource', () => {
    it('accepts known sources', () => {
      for (const s of UNIFIED_SOURCES) {
        expect(isUnifiedSource(s)).toBe(true);
      }
    });
    it('rejects unknown values', () => {
      expect(isUnifiedSource('foo')).toBe(false);
      expect(isUnifiedSource('')).toBe(false);
      expect(isUnifiedSource('REPORTS')).toBe(false);
    });
  });

  describe('filterUnifiedSources', () => {
    it('keeps only known sources and trims whitespace', () => {
      const out = filterUnifiedSources(['reports', ' hipcamp ', 'invalid', '', 'campspot']);
      expect(out).toEqual(['reports', 'hipcamp', 'campspot']);
    });
    it('returns [] when nothing matches', () => {
      expect(filterUnifiedSources(['foo', 'bar'])).toEqual([]);
    });
  });

  describe('unifiedSourceLabel', () => {
    it('maps each known source to a human label', () => {
      expect(unifiedSourceLabel('reports')).toBe('Past Reports');
      expect(unifiedSourceLabel('all_glamping_properties')).toBe('Sage');
      expect(unifiedSourceLabel('hipcamp')).toBe('Hipcamp');
      expect(unifiedSourceLabel('campspot')).toBe('Campspot');
      expect(unifiedSourceLabel('all_roverpass_data_new')).toBe('RoverPass');
    });
    it('passes unknown sources through unchanged', () => {
      expect(unifiedSourceLabel('something_new')).toBe('something_new');
    });
  });

  describe('unifiedSourceBadgeClass', () => {
    it('returns a non-empty Tailwind class string for every known source', () => {
      for (const s of UNIFIED_SOURCES) {
        expect(unifiedSourceBadgeClass(s)).toMatch(/bg-/);
      }
    });
    it('falls back to a neutral class for unknown sources', () => {
      expect(unifiedSourceBadgeClass('foo')).toMatch(/bg-gray/);
    });
  });

  describe('UNIFIED_SORT_COLUMNS', () => {
    it('maps each sort key to itself (the matview column name)', () => {
      for (const [key, col] of Object.entries(UNIFIED_SORT_COLUMNS)) {
        expect(col).toBe(key);
      }
    });
  });
});
