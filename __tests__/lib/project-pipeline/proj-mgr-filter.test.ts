import {
  jobMatchesProjectPipelineProjMgrFilters,
  PROJECT_PIPELINE_PROJ_MGR_FILTER_OPTIONS,
} from '@/lib/project-pipeline/proj-mgr-filter';

describe('jobMatchesProjectPipelineProjMgrFilters', () => {
  it('exposes fixed proj mgr options', () => {
    expect(PROJECT_PIPELINE_PROJ_MGR_FILTER_OPTIONS).toEqual(['Shari', 'Ulyana']);
  });

  it('matches when no filter is selected', () => {
    expect(jobMatchesProjectPipelineProjMgrFilters('Shari', [])).toBe(true);
  });

  it('matches selected project managers by first name', () => {
    expect(jobMatchesProjectPipelineProjMgrFilters('Shari Heilala', ['Shari'])).toBe(true);
    expect(jobMatchesProjectPipelineProjMgrFilters('Ulyana', ['Ulyana'])).toBe(true);
    expect(jobMatchesProjectPipelineProjMgrFilters('Shari', ['Ulyana'])).toBe(false);
  });

  it('matches when any selected manager matches', () => {
    expect(jobMatchesProjectPipelineProjMgrFilters('Shari', ['Shari', 'Ulyana'])).toBe(true);
    expect(jobMatchesProjectPipelineProjMgrFilters('Ulyana', ['Shari', 'Ulyana'])).toBe(true);
  });
});
