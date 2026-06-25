import {
  parseSegmentFilterParam,
  readPersistedSegmentFilter,
  segmentFilterToUrlValue,
  writePersistedSegmentFilter,
} from '@/lib/project-pipeline/segment-filter-storage';

describe('segment-filter-storage', () => {
  describe('parseSegmentFilterParam', () => {
    it('parses Outdoor and Commercial', () => {
      expect(parseSegmentFilterParam('Outdoor')).toBe('Outdoor');
      expect(parseSegmentFilterParam('commercial')).toBe('Commercial');
    });

    it('parses all divisions', () => {
      expect(parseSegmentFilterParam('all')).toBe('');
      expect(parseSegmentFilterParam('')).toBe('');
    });

    it('returns null for unknown values', () => {
      expect(parseSegmentFilterParam('Retail')).toBeNull();
      expect(parseSegmentFilterParam(null)).toBeNull();
    });
  });

  describe('segmentFilterToUrlValue', () => {
    it('maps empty segment to all', () => {
      expect(segmentFilterToUrlValue('')).toBe('all');
      expect(segmentFilterToUrlValue('Outdoor')).toBe('Outdoor');
    });
  });

  describe('readPersistedSegmentFilter', () => {
    it('prefers URL over sessionStorage', () => {
      sessionStorage.setItem('project-pipeline-segment-filter', 'Commercial');
      const params = new URLSearchParams('segment=Outdoor');
      expect(readPersistedSegmentFilter(params)).toBe('Outdoor');
    });

    it('falls back to sessionStorage', () => {
      sessionStorage.setItem('project-pipeline-segment-filter', 'all');
      expect(readPersistedSegmentFilter(new URLSearchParams())).toBe('');
    });
  });

  describe('writePersistedSegmentFilter', () => {
    it('updates sessionStorage and router URL', () => {
      const replace = jest.fn();
      window.history.pushState({}, '', '/admin/job-pipeline?foo=1');

      writePersistedSegmentFilter('Commercial', {
        pathname: '/admin/job-pipeline',
        router: { replace },
      });

      expect(sessionStorage.getItem('project-pipeline-segment-filter')).toBe('Commercial');
      expect(replace).toHaveBeenCalledWith('/admin/job-pipeline?foo=1&segment=Commercial');
    });

    it('removes segment param for all divisions', () => {
      const replace = jest.fn();
      window.history.pushState({}, '', '/admin/job-pipeline?segment=Outdoor');

      writePersistedSegmentFilter('', {
        pathname: '/admin/job-pipeline',
        router: { replace },
      });

      expect(replace).toHaveBeenCalledWith('/admin/job-pipeline');
    });
  });
});
