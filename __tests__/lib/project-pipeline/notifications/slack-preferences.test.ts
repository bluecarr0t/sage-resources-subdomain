import {
  DEFAULT_PIPELINE_SLACK_PREFERENCES,
  buildPipelineSlackPreferencesMap,
  filterRecipientsBySlackPreference,
  mergePipelineSlackPreferences,
  parsePipelineSlackPreferences,
  parsePipelineSlackPreferencesPatch,
} from '@/lib/project-pipeline/notifications/slack-preferences';

describe('parsePipelineSlackPreferences', () => {
  it('returns defaults for invalid input', () => {
    expect(parsePipelineSlackPreferences(null)).toEqual(DEFAULT_PIPELINE_SLACK_PREFERENCES);
    expect(parsePipelineSlackPreferences('invalid')).toEqual(DEFAULT_PIPELINE_SLACK_PREFERENCES);
  });

  it('merges partial objects with defaults', () => {
    expect(parsePipelineSlackPreferences({ dueDateChange: false })).toEqual({
      ...DEFAULT_PIPELINE_SLACK_PREFERENCES,
      dueDateChange: false,
      pmDueDateChange: false,
    });
  });
});

describe('mergePipelineSlackPreferences', () => {
  it('only updates provided boolean keys', () => {
    expect(
      mergePipelineSlackPreferences(DEFAULT_PIPELINE_SLACK_PREFERENCES, {
        submitForReview: false,
      })
    ).toEqual({
      ...DEFAULT_PIPELINE_SLACK_PREFERENCES,
      submitForReview: false,
    });
  });
});

describe('parsePipelineSlackPreferencesPatch', () => {
  it('accepts valid boolean patches', () => {
    expect(parsePipelineSlackPreferencesPatch({ dueDateChange: false })).toEqual({
      dueDateChange: false,
    });
  });

  it('rejects project-manager keys for consultant-only users', () => {
    expect(
      parsePipelineSlackPreferencesPatch({ submitForReview: false }, { isProjectManager: false })
    ).toBeNull();
    expect(
      parsePipelineSlackPreferencesPatch({ dueDateChange: false }, { isProjectManager: false })
    ).toEqual({ dueDateChange: false });
  });
});

describe('filterRecipientsBySlackPreference', () => {
  it('filters recipients using stored preferences', () => {
    const prefsMap = buildPipelineSlackPreferencesMap([
      {
        email: 'a@example.com',
        pipeline_slack_preferences: { ...DEFAULT_PIPELINE_SLACK_PREFERENCES, dueDateChange: false },
      },
      {
        email: 'b@example.com',
        pipeline_slack_preferences: DEFAULT_PIPELINE_SLACK_PREFERENCES,
      },
    ]);

    expect(
      filterRecipientsBySlackPreference(
        ['a@example.com', 'b@example.com'],
        'dueDateChange',
        prefsMap
      )
    ).toEqual(['b@example.com']);
  });
});
