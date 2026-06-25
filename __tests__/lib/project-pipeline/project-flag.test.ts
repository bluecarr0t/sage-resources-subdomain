import {
  getProjectPipelineFlagWarningIconClassName,
  normalizeProjectPipelineFlag,
  shouldShowProjectPipelineFlagWarning,
} from '@/lib/project-pipeline/project-flag';

describe('project-flag', () => {
  it('normalizes unknown values to None', () => {
    expect(normalizeProjectPipelineFlag('Attention')).toBe('Attention');
    expect(normalizeProjectPipelineFlag('')).toBe('None');
    expect(normalizeProjectPipelineFlag('Invalid')).toBe('None');
    expect(normalizeProjectPipelineFlag('On Hold')).toBe('None');
  });

  it('shows warning for active flags only', () => {
    expect(shouldShowProjectPipelineFlagWarning('None')).toBe(false);
    expect(shouldShowProjectPipelineFlagWarning('Escalation')).toBe(true);
  });

  it('maps flag values to warning icon colors', () => {
    expect(getProjectPipelineFlagWarningIconClassName('Escalation')).toContain('red');
    expect(getProjectPipelineFlagWarningIconClassName('Attention')).toContain('amber');
  });
});
