import {
  DEFAULT_PIPELINE_EMAIL_PREFERENCES,
  buildPipelineEmailPreferencesMap,
  filterRecipientsByEmailPreference,
  getVisiblePipelineEmailPreferenceKeys,
  mergePipelineEmailPreferences,
  parsePipelineEmailPreferences,
  parsePipelineEmailPreferencesPatch,
} from '@/lib/project-pipeline/notifications/email-preferences';

describe('parsePipelineEmailPreferences', () => {
  it('returns defaults for invalid input', () => {
    expect(parsePipelineEmailPreferences(null)).toEqual(DEFAULT_PIPELINE_EMAIL_PREFERENCES);
    expect(parsePipelineEmailPreferences('invalid')).toEqual(DEFAULT_PIPELINE_EMAIL_PREFERENCES);
  });

  it('merges partial objects with defaults', () => {
    expect(parsePipelineEmailPreferences({ dueDateChange: false })).toEqual({
      ...DEFAULT_PIPELINE_EMAIL_PREFERENCES,
      dueDateChange: false,
      pmDueDateChange: false,
    });
  });

  it('inherits legacy review and due date prefs for project manager keys', () => {
    expect(
      parsePipelineEmailPreferences({
        reviewStatusChange: false,
        dueDateChange: false,
        projectStatusChange: false,
      })
    ).toEqual({
      ...DEFAULT_PIPELINE_EMAIL_PREFERENCES,
      reviewStatusChange: false,
      dueDateChange: false,
      projectStatusChange: false,
      pmReviewStatusChange: false,
      pmDueDateChange: false,
      pmProjectStatusChange: false,
    });
  });
});

describe('mergePipelineEmailPreferences', () => {
  it('only updates provided boolean keys', () => {
    expect(
      mergePipelineEmailPreferences(DEFAULT_PIPELINE_EMAIL_PREFERENCES, {
        submitForReview: false,
      })
    ).toEqual({
      ...DEFAULT_PIPELINE_EMAIL_PREFERENCES,
      submitForReview: false,
    });
  });
});

describe('parsePipelineEmailPreferencesPatch', () => {
  it('accepts valid boolean patches', () => {
    expect(parsePipelineEmailPreferencesPatch({ dueDateChange: false })).toEqual({
      dueDateChange: false,
    });
  });

  it('rejects invalid values', () => {
    expect(parsePipelineEmailPreferencesPatch({ dueDateChange: 'no' })).toBeNull();
    expect(parsePipelineEmailPreferencesPatch({})).toBeNull();
  });

  it('rejects project-manager keys for consultant-only users', () => {
    expect(
      parsePipelineEmailPreferencesPatch({ submitForReview: false }, { isProjectManager: false })
    ).toBeNull();
    expect(
      parsePipelineEmailPreferencesPatch({ dueDateChange: false }, { isProjectManager: false })
    ).toEqual({ dueDateChange: false });
  });
});

describe('getVisiblePipelineEmailPreferenceKeys', () => {
  it('shows consultant keys only for authors', () => {
    expect(getVisiblePipelineEmailPreferenceKeys(false)).toEqual([
      'reviewStatusChange',
      'dueDateChange',
      'projectStatusChange',
      'dueDateReminderUpcoming',
      'dueDateReminderDueToday',
      'dueDateReminderOverdue',
    ]);
  });

  it('shows all configurable keys for project managers', () => {
    expect(getVisiblePipelineEmailPreferenceKeys(true)).toEqual([
      'submitForReview',
      'resubmitForReview',
      'pmDueDateChange',
      'pmProjectStatusChange',
      'pmDueDateReminderUpcoming',
      'pmDueDateReminderDueToday',
      'pmDueDateReminderOverdue',
      'reviewStatusChange',
      'dueDateChange',
      'projectStatusChange',
      'dueDateReminderUpcoming',
      'dueDateReminderDueToday',
      'dueDateReminderOverdue',
    ]);
  });

  it('keeps submission receipt preferences always enabled', () => {
    expect(
      parsePipelineEmailPreferences({
        submitForReviewReceipt: false,
        resubmitForReviewReceipt: false,
      })
    ).toEqual({
      ...DEFAULT_PIPELINE_EMAIL_PREFERENCES,
      submitForReviewReceipt: true,
      resubmitForReviewReceipt: true,
    });
  });

  it('rejects patches for always-enabled receipt preferences', () => {
    expect(
      parsePipelineEmailPreferencesPatch({ submitForReviewReceipt: false }, { isProjectManager: false })
    ).toBeNull();
  });

  it('rejects patches for hidden project manager preferences', () => {
    expect(
      parsePipelineEmailPreferencesPatch({ pmReviewStatusChange: false }, { isProjectManager: true })
    ).toBeNull();
  });
});

describe('filterRecipientsByEmailPreference', () => {
  const prefsMap = buildPipelineEmailPreferencesMap([
    {
      email: 'harsell@sageoutdooradvisory.com',
      pipeline_email_preferences: { ...DEFAULT_PIPELINE_EMAIL_PREFERENCES, dueDateChange: false },
    },
    {
      email: 'marran@sageoutdooradvisory.com',
      pipeline_email_preferences: DEFAULT_PIPELINE_EMAIL_PREFERENCES,
    },
  ]);

  it('drops recipients with the preference disabled', () => {
    expect(
      filterRecipientsByEmailPreference(
        ['harsell@sageoutdooradvisory.com', 'marran@sageoutdooradvisory.com'],
        'dueDateChange',
        prefsMap
      )
    ).toEqual(['marran@sageoutdooradvisory.com']);
  });

  it('keeps unknown recipients enabled by default', () => {
    expect(
      filterRecipientsByEmailPreference(['unknown@example.com'], 'dueDateChange', prefsMap)
    ).toEqual(['unknown@example.com']);
  });
});
