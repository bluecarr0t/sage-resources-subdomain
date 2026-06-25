import {
  applyProjectPipelineMetricFilter,
  resolveProjectPipelineMetricFilter,
} from '@/components/project-pipeline/ProjectPipelineMetrics';

describe('applyProjectPipelineMetricFilter', () => {
  it('resets table filters and applies outdoor segment only', () => {
    expect(applyProjectPipelineMetricFilter('outdoor')).toEqual({
      segmentFilter: 'Outdoor',
      dueWithin30DaysOnly: false,
      outdoorPastDueOnly: false,
      projectStatusFilter: '',
      search: '',
      serviceFilter: '',
    });
  });

  it('applies commercial segment only', () => {
    expect(applyProjectPipelineMetricFilter('commercial')).toEqual({
      segmentFilter: 'Commercial',
      dueWithin30DaysOnly: false,
      outdoorPastDueOnly: false,
      projectStatusFilter: '',
      search: '',
      serviceFilter: '',
    });
  });

  it('applies outdoor due within 30 days filters', () => {
    expect(applyProjectPipelineMetricFilter('dueWithin30Days')).toEqual({
      segmentFilter: 'Outdoor',
      dueWithin30DaysOnly: true,
      outdoorPastDueOnly: false,
      projectStatusFilter: '',
      search: '',
      serviceFilter: '',
    });
  });

  it('applies outdoor past due filters', () => {
    expect(applyProjectPipelineMetricFilter('outdoorPastDue')).toEqual({
      segmentFilter: 'Outdoor',
      dueWithin30DaysOnly: false,
      outdoorPastDueOnly: true,
      projectStatusFilter: '',
      search: '',
      serviceFilter: '',
    });
  });
});

describe('resolveProjectPipelineMetricFilter', () => {
  it('resolves outdoor and commercial without due date flags', () => {
    expect(resolveProjectPipelineMetricFilter('Outdoor', false, false)).toBe('outdoor');
    expect(resolveProjectPipelineMetricFilter('Commercial', false, false)).toBe('commercial');
  });

  it('resolves outdoor due date metric filters', () => {
    expect(resolveProjectPipelineMetricFilter('Outdoor', true, false)).toBe('dueWithin30Days');
    expect(resolveProjectPipelineMetricFilter('Outdoor', false, true)).toBe('outdoorPastDue');
  });

  it('returns null when filters do not match a metric tile', () => {
    expect(resolveProjectPipelineMetricFilter('', false, false)).toBeNull();
    expect(resolveProjectPipelineMetricFilter('Commercial', true, false)).toBeNull();
  });
});
