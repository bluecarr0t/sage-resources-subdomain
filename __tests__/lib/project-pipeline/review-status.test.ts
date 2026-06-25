import {
  getReviewStatusDisplayLabel,
  getReviewStatusDropdownLabel,
  getReviewStatusSelectClassName,
  getReviewStatusStyle,
  getShortReviewStatusLabel,
  normalizeProjectPipelineReviewStatus,
} from '@/lib/project-pipeline/review-status';

describe('normalizeProjectPipelineReviewStatus', () => {
  it('maps blank and Not Started to empty', () => {
    expect(normalizeProjectPipelineReviewStatus('')).toBe('');
    expect(normalizeProjectPipelineReviewStatus('Not Started')).toBe('');
    expect(normalizeProjectPipelineReviewStatus('  not started  ')).toBe('');
  });

  it('preserves other statuses', () => {
    expect(normalizeProjectPipelineReviewStatus('In-Progress')).toBe('In-Progress');
  });
});

describe('project-pipeline review-status', () => {
  it('shortens approved compound statuses', () => {
    expect(
      getShortReviewStatusLabel('Approved - Minor Changes, Then Send to Client')
    ).toBe('Approved');
  });

  it('shows full approved labels in dropdown options', () => {
    expect(
      getReviewStatusDropdownLabel('Approved - Minor Changes, Then Send to Client')
    ).toBe('Approved - Minor Changes, Then Send to Client');
    expect(getReviewStatusDropdownLabel('Approved - No Changes, Send to Client')).toBe(
      'Approved - No Changes, Send to Client'
    );
    expect(getReviewStatusDropdownLabel('Not Started')).toBe('—');
    expect(getReviewStatusDropdownLabel('')).toBe('—');
  });

  it('shortens other compound statuses at the dash', () => {
    expect(getShortReviewStatusLabel('In Review - Awaiting Client')).toBe('Awaiting Reviewer');
  });

  it('displays In-Progress as Awaiting Reviewer', () => {
    expect(getShortReviewStatusLabel('In-Progress')).toBe('Awaiting Reviewer');
    expect(getReviewStatusDropdownLabel('In-Progress')).toBe('Awaiting Reviewer');
  });

  it('renders empty review status as a dash', () => {
    expect(getReviewStatusDisplayLabel('')).toBe('—');
    expect(getReviewStatusDisplayLabel('Not Started')).toBe('—');
    expect(getShortReviewStatusLabel('Not Started')).toBe('');
  });

  it('styles review status pills for compact display', () => {
    expect(getReviewStatusStyle('')).toContain('gray');
    expect(getReviewStatusStyle('')).toContain('/20');
    expect(getReviewStatusStyle('Not Started')).toContain('gray');
    expect(getReviewStatusStyle('In Review')).toContain('yellow');
    expect(getReviewStatusStyle('In-Progress')).toContain('yellow');
    expect(getReviewStatusStyle('Changes Requested')).toContain('orange');
    expect(getReviewStatusStyle('Approved - No Changes, Send to Client')).toContain('green');
    expect(getReviewStatusStyle('Approved - No Changes, Send to Client')).toContain('/20');
  });

  it('styles review status selects with text color only', () => {
    expect(getReviewStatusSelectClassName('Changes Requested')).toContain('text-orange');
    expect(getReviewStatusSelectClassName('Changes Requested')).toContain('bg-white');
    expect(getReviewStatusSelectClassName('Changes Requested')).not.toContain('/20');
    expect(getReviewStatusSelectClassName('Approved - No Changes, Send to Client')).toContain(
      'text-green'
    );
  });
});
