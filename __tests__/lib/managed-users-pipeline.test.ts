import {
  canViewAllPipelineJobs,
  resolvePipelineSegmentDefault,
} from '@/lib/managed-users-pipeline';

describe('canViewAllPipelineJobs', () => {
  it('returns true when pipeline_view_all is set', () => {
    expect(canViewAllPipelineJobs({ pipeline_view_all: true })).toBe(true);
    expect(canViewAllPipelineJobs({ pipeline_view_all: false })).toBe(false);
    expect(canViewAllPipelineJobs(null)).toBe(false);
  });
});

describe('resolvePipelineSegmentDefault', () => {
  it('uses division for the default pipeline segment filter', () => {
    expect(
      resolvePipelineSegmentDefault({ division: 'commercial' }, 'user@sageoutdooradvisory.com')
    ).toBe('Commercial');
    expect(
      resolvePipelineSegmentDefault({ division: 'outdoor' }, 'user@sagecommercialadvisory.com')
    ).toBe('Outdoor');
  });

  it('returns null for both divisions when division is both or unset', () => {
    expect(resolvePipelineSegmentDefault({ division: 'both' }, 'user@sageoutdooradvisory.com')).toBe(
      null
    );
    expect(resolvePipelineSegmentDefault(null, 'user@sagecommercialadvisory.com')).toBe(null);
  });
});
