/** Always on — not shown in account notification settings. */
export const ALWAYS_ENABLED_PIPELINE_SLACK_PREFERENCE_KEYS = [
  'submitForReviewReceipt',
  'resubmitForReviewReceipt',
] as const;

/** Stored and honored for notifications, but hidden from /admin/account. */
export const HIDDEN_FROM_ACCOUNT_PIPELINE_SLACK_PREFERENCE_KEYS = [
  'pmReviewStatusChange',
] as const;

export const CONSULTANT_PIPELINE_SLACK_PREFERENCE_KEYS = [
  'reviewStatusChange',
  'dueDateChange',
  'projectStatusChange',
  'dueDateReminderUpcoming',
  'dueDateReminderDueToday',
  'dueDateReminderOverdue',
] as const;

export const PROJECT_MANAGER_PIPELINE_SLACK_PREFERENCE_KEYS = [
  'submitForReview',
  'resubmitForReview',
  'pmReviewStatusChange',
  'pmDueDateChange',
  'pmProjectStatusChange',
  'pmDueDateReminderUpcoming',
  'pmDueDateReminderDueToday',
  'pmDueDateReminderOverdue',
] as const;

export const VISIBLE_PROJECT_MANAGER_PIPELINE_SLACK_PREFERENCE_KEYS =
  PROJECT_MANAGER_PIPELINE_SLACK_PREFERENCE_KEYS.filter(
    (key) =>
      !HIDDEN_FROM_ACCOUNT_PIPELINE_SLACK_PREFERENCE_KEYS.includes(
        key as (typeof HIDDEN_FROM_ACCOUNT_PIPELINE_SLACK_PREFERENCE_KEYS)[number]
      )
  );

export const PIPELINE_SLACK_PREFERENCE_KEYS = [
  ...PROJECT_MANAGER_PIPELINE_SLACK_PREFERENCE_KEYS,
  ...ALWAYS_ENABLED_PIPELINE_SLACK_PREFERENCE_KEYS,
  ...CONSULTANT_PIPELINE_SLACK_PREFERENCE_KEYS,
] as const;

export type PipelineSlackPreferenceKey = (typeof PIPELINE_SLACK_PREFERENCE_KEYS)[number];

export type PipelineSlackPreferences = Record<PipelineSlackPreferenceKey, boolean>;

export const DEFAULT_PIPELINE_SLACK_PREFERENCES: PipelineSlackPreferences = {
  submitForReview: true,
  resubmitForReview: true,
  submitForReviewReceipt: true,
  resubmitForReviewReceipt: true,
  pmReviewStatusChange: true,
  pmDueDateChange: true,
  pmProjectStatusChange: true,
  pmDueDateReminderUpcoming: true,
  pmDueDateReminderDueToday: true,
  pmDueDateReminderOverdue: true,
  reviewStatusChange: true,
  dueDateChange: true,
  projectStatusChange: true,
  dueDateReminderUpcoming: true,
  dueDateReminderDueToday: true,
  dueDateReminderOverdue: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePipelineSlackPreferences(value: unknown): PipelineSlackPreferences {
  if (!isRecord(value)) {
    return { ...DEFAULT_PIPELINE_SLACK_PREFERENCES };
  }

  const parsed = { ...DEFAULT_PIPELINE_SLACK_PREFERENCES };
  for (const key of PIPELINE_SLACK_PREFERENCE_KEYS) {
    if (typeof value[key] === 'boolean') {
      parsed[key] = value[key];
    }
  }

  if (
    typeof value.reviewStatusChange === 'boolean' &&
    typeof value.pmReviewStatusChange !== 'boolean'
  ) {
    parsed.pmReviewStatusChange = value.reviewStatusChange;
  }
  if (typeof value.dueDateChange === 'boolean' && typeof value.pmDueDateChange !== 'boolean') {
    parsed.pmDueDateChange = value.dueDateChange;
  }
  if (
    typeof value.projectStatusChange === 'boolean' &&
    typeof value.pmProjectStatusChange !== 'boolean'
  ) {
    parsed.pmProjectStatusChange = value.projectStatusChange;
  }

  for (const key of ALWAYS_ENABLED_PIPELINE_SLACK_PREFERENCE_KEYS) {
    parsed[key] = true;
  }

  return parsed;
}

export function mergePipelineSlackPreferences(
  current: PipelineSlackPreferences,
  patch: Partial<PipelineSlackPreferences>
): PipelineSlackPreferences {
  const merged = { ...current };
  for (const key of PIPELINE_SLACK_PREFERENCE_KEYS) {
    if (typeof patch[key] === 'boolean') {
      merged[key] = patch[key]!;
    }
  }

  for (const key of ALWAYS_ENABLED_PIPELINE_SLACK_PREFERENCE_KEYS) {
    merged[key] = true;
  }

  return merged;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildPipelineSlackPreferencesMap(
  rows: readonly { email?: string | null; pipeline_slack_preferences?: unknown }[]
): Map<string, PipelineSlackPreferences> {
  const map = new Map<string, PipelineSlackPreferences>();
  for (const row of rows) {
    const email = row.email?.trim();
    if (!email) continue;
    map.set(normalizeEmail(email), parsePipelineSlackPreferences(row.pipeline_slack_preferences));
  }
  return map;
}

function isAlwaysEnabledPipelineSlackPreference(
  preferenceKey: PipelineSlackPreferenceKey
): preferenceKey is (typeof ALWAYS_ENABLED_PIPELINE_SLACK_PREFERENCE_KEYS)[number] {
  return ALWAYS_ENABLED_PIPELINE_SLACK_PREFERENCE_KEYS.includes(
    preferenceKey as (typeof ALWAYS_ENABLED_PIPELINE_SLACK_PREFERENCE_KEYS)[number]
  );
}

function isHiddenFromAccountPipelineSlackPreference(
  preferenceKey: PipelineSlackPreferenceKey
): preferenceKey is (typeof HIDDEN_FROM_ACCOUNT_PIPELINE_SLACK_PREFERENCE_KEYS)[number] {
  return HIDDEN_FROM_ACCOUNT_PIPELINE_SLACK_PREFERENCE_KEYS.includes(
    preferenceKey as (typeof HIDDEN_FROM_ACCOUNT_PIPELINE_SLACK_PREFERENCE_KEYS)[number]
  );
}

export function isPipelineSlackEnabledForUser(
  email: string,
  preferenceKey: PipelineSlackPreferenceKey,
  prefsMap: ReadonlyMap<string, PipelineSlackPreferences>
): boolean {
  if (isAlwaysEnabledPipelineSlackPreference(preferenceKey)) {
    return true;
  }

  const prefs = prefsMap.get(normalizeEmail(email));
  if (!prefs) return true;
  return prefs[preferenceKey];
}

export function filterRecipientsBySlackPreference(
  recipients: readonly string[],
  preferenceKey: PipelineSlackPreferenceKey,
  prefsMap: ReadonlyMap<string, PipelineSlackPreferences>
): string[] {
  return recipients.filter((email) =>
    isPipelineSlackEnabledForUser(email, preferenceKey, prefsMap)
  );
}

export function isPipelineSlackPreferenceAllowedForUser(
  key: PipelineSlackPreferenceKey,
  isProjectManager: boolean
): boolean {
  if (isAlwaysEnabledPipelineSlackPreference(key)) {
    return false;
  }

  if (isHiddenFromAccountPipelineSlackPreference(key)) {
    return false;
  }

  if (
    PROJECT_MANAGER_PIPELINE_SLACK_PREFERENCE_KEYS.includes(
      key as (typeof PROJECT_MANAGER_PIPELINE_SLACK_PREFERENCE_KEYS)[number]
    )
  ) {
    return isProjectManager;
  }
  return true;
}

export function parsePipelineSlackPreferencesPatch(
  body: unknown,
  options?: { isProjectManager?: boolean }
): Partial<PipelineSlackPreferences> | null {
  if (!isRecord(body)) return null;

  const patch: Partial<PipelineSlackPreferences> = {};
  let hasKey = false;
  const isProjectManager = options?.isProjectManager ?? true;

  for (const key of PIPELINE_SLACK_PREFERENCE_KEYS) {
    if (key in body) {
      if (typeof body[key] !== 'boolean') return null;
      if (!isPipelineSlackPreferenceAllowedForUser(key, isProjectManager)) return null;
      patch[key] = body[key];
      hasKey = true;
    }
  }

  return hasKey ? patch : null;
}
