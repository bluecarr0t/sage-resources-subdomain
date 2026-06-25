import {
  compareProjectPipelineProjectStatus,
  DEFAULT_PROJECT_PIPELINE_PROJECT_STATUS,
  getProjectStatusPillClasses,
  getProjectStatusSelectTextClassName,
  getProjectStatusStyle,
  isConsultantWorkloadVisibleProjectStatus,
  normalizeProjectPipelineProjectStatus,
} from '@/lib/project-pipeline/project-status';

describe('normalizeProjectPipelineProjectStatus', () => {
  it('defaults invalid values to Not Started', () => {
    expect(normalizeProjectPipelineProjectStatus('')).toBe(
      DEFAULT_PROJECT_PIPELINE_PROJECT_STATUS
    );
    expect(normalizeProjectPipelineProjectStatus('Unknown')).toBe('Not Started');
  });

  it('preserves valid statuses', () => {
    expect(normalizeProjectPipelineProjectStatus('In-Progress')).toBe('In-Progress');
    expect(normalizeProjectPipelineProjectStatus('On Hold')).toBe('On Hold');
    expect(normalizeProjectPipelineProjectStatus('Completed')).toBe('Completed');
  });
});

describe('isConsultantWorkloadVisibleProjectStatus', () => {
  it('includes only Not Started and In-Progress', () => {
    expect(isConsultantWorkloadVisibleProjectStatus('Not Started')).toBe(true);
    expect(isConsultantWorkloadVisibleProjectStatus('In-Progress')).toBe(true);
    expect(isConsultantWorkloadVisibleProjectStatus('In Review')).toBe(false);
    expect(isConsultantWorkloadVisibleProjectStatus('On Hold')).toBe(false);
    expect(isConsultantWorkloadVisibleProjectStatus('Completed')).toBe(false);
    expect(isConsultantWorkloadVisibleProjectStatus('Cancelled')).toBe(false);
  });
});

describe('getProjectStatusStyle', () => {
  it('returns gray for Not Started', () => {
    expect(getProjectStatusStyle('Not Started')).toContain('gray');
  });

  it('returns yellow for In-Progress', () => {
    expect(getProjectStatusStyle('In-Progress')).toContain('yellow');
  });

  it('returns neutral for On Hold', () => {
    expect(getProjectStatusStyle('On Hold')).toContain('neutral');
  });

  it('returns blue for In Review', () => {
    expect(getProjectStatusStyle('In Review')).toContain('blue');
  });

  it('returns green for Completed', () => {
    expect(getProjectStatusStyle('Completed')).toContain('green');
  });

  it('returns red for Cancelled', () => {
    expect(getProjectStatusStyle('Cancelled')).toContain('red');
  });
});

describe('getProjectStatusSelectTextClassName', () => {
  it('returns text color classes without filled backgrounds', () => {
    expect(getProjectStatusSelectTextClassName('In-Progress')).toContain('text-yellow');
    expect(getProjectStatusSelectTextClassName('In-Progress')).not.toContain('bg-');
    expect(getProjectStatusSelectTextClassName('Completed')).toContain('text-green');
  });
});

describe('getProjectStatusPillClasses', () => {
  it('returns borderless pill classes', () => {
    const classes = getProjectStatusPillClasses('In-Progress');
    expect(classes).toContain('bg-yellow');
    expect(classes).not.toContain('border-');
  });
});

describe('compareProjectPipelineProjectStatus', () => {
  it('orders statuses in pipeline workflow sequence', () => {
    expect(compareProjectPipelineProjectStatus('Not Started', 'In-Progress')).toBeLessThan(0);
    expect(compareProjectPipelineProjectStatus('In-Progress', 'In Review')).toBeLessThan(0);
    expect(compareProjectPipelineProjectStatus('In-Progress', 'On Hold')).toBeLessThan(0);
    expect(compareProjectPipelineProjectStatus('On Hold', 'In Review')).toBeLessThan(0);
    expect(compareProjectPipelineProjectStatus('In Review', 'Completed')).toBeLessThan(0);
    expect(compareProjectPipelineProjectStatus('Completed', 'Cancelled')).toBeLessThan(0);
    expect(compareProjectPipelineProjectStatus('Completed', 'In-Progress')).toBeGreaterThan(0);
  });
});
