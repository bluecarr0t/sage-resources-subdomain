import {
  formatProjectPipelineActivityAction,
  summarizeProjectPipelineActivityChanges,
} from '@/lib/project-pipeline/activity/format-activity';

describe('formatProjectPipelineActivityAction', () => {
  it('labels review actions with workflow context', () => {
    expect(
      formatProjectPipelineActivityAction('review_action', { reviewAction: 'submit_for_review' })
    ).toBe('Submitted for review');
  });

  it('labels Google Sheets sync actions', () => {
    expect(formatProjectPipelineActivityAction('sheet_sync_created')).toBe(
      'Synced from Google Sheets (new job)'
    );
    expect(formatProjectPipelineActivityAction('sheet_sync_updated')).toBe(
      'Synced from Google Sheets (updated)'
    );
  });
});

describe('summarizeProjectPipelineActivityChanges', () => {
  it('summarizes field transitions', () => {
    expect(
      summarizeProjectPipelineActivityChanges([
        {
          field: 'dueDate',
          label: 'Due date',
          previousValue: '3/20/26',
          newValue: '4/1/26',
        },
      ])
    ).toBe('Due date: 3/20/26 → 4/1/26');
  });
});
