/** Always on — not shown in account notification settings. */
export const ALWAYS_ENABLED_PIPELINE_EMAIL_PREFERENCE_KEYS = [
  'submitForReviewReceipt',
  'resubmitForReviewReceipt',
] as const;

/** Stored and honored for notifications, but hidden from /admin/account. */
export const HIDDEN_FROM_ACCOUNT_PIPELINE_EMAIL_PREFERENCE_KEYS = [
  'pmReviewStatusChange',
] as const;

export const CONSULTANT_PIPELINE_EMAIL_PREFERENCE_KEYS = [
  'reviewStatusChange',
  'dueDateChange',
  'projectStatusChange',
  'dueDateReminderUpcoming',
  'dueDateReminderDueToday',
  'dueDateReminderOverdue',
] as const;

export const PROJECT_MANAGER_PIPELINE_EMAIL_PREFERENCE_KEYS = [
  'submitForReview',
  'resubmitForReview',
  'pmReviewStatusChange',
  'pmDueDateChange',
  'pmProjectStatusChange',
  'pmDueDateReminderUpcoming',
  'pmDueDateReminderDueToday',
  'pmDueDateReminderOverdue',
] as const;

export const VISIBLE_PROJECT_MANAGER_PIPELINE_EMAIL_PREFERENCE_KEYS =
  PROJECT_MANAGER_PIPELINE_EMAIL_PREFERENCE_KEYS.filter(
    (key) =>
      !HIDDEN_FROM_ACCOUNT_PIPELINE_EMAIL_PREFERENCE_KEYS.includes(
        key as (typeof HIDDEN_FROM_ACCOUNT_PIPELINE_EMAIL_PREFERENCE_KEYS)[number]
      )
  );

export const PIPELINE_EMAIL_PREFERENCE_KEYS = [
  ...PROJECT_MANAGER_PIPELINE_EMAIL_PREFERENCE_KEYS,
  ...ALWAYS_ENABLED_PIPELINE_EMAIL_PREFERENCE_KEYS,
  ...CONSULTANT_PIPELINE_EMAIL_PREFERENCE_KEYS,
] as const;

export type PipelineEmailPreferenceKey = (typeof PIPELINE_EMAIL_PREFERENCE_KEYS)[number];

export type PipelineEmailPreferences = Record<PipelineEmailPreferenceKey, boolean>;

export const DEFAULT_PIPELINE_EMAIL_PREFERENCES: PipelineEmailPreferences = {
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

export function parsePipelineEmailPreferences(
  value: unknown
): PipelineEmailPreferences {
  if (!isRecord(value)) {
    return { ...DEFAULT_PIPELINE_EMAIL_PREFERENCES };
  }

  const parsed = { ...DEFAULT_PIPELINE_EMAIL_PREFERENCES };
  for (const key of PIPELINE_EMAIL_PREFERENCE_KEYS) {
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

  for (const key of ALWAYS_ENABLED_PIPELINE_EMAIL_PREFERENCE_KEYS) {
    parsed[key] = true;
  }

  return parsed;
}

export function mergePipelineEmailPreferences(
  current: PipelineEmailPreferences,
  patch: Partial<PipelineEmailPreferences>
): PipelineEmailPreferences {
  const merged = { ...current };
  for (const key of PIPELINE_EMAIL_PREFERENCE_KEYS) {
    if (typeof patch[key] === 'boolean') {
      merged[key] = patch[key]!;
    }
  }

  for (const key of ALWAYS_ENABLED_PIPELINE_EMAIL_PREFERENCE_KEYS) {
    merged[key] = true;
  }

  return merged;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildPipelineEmailPreferencesMap(
  rows: readonly { email?: string | null; pipeline_email_preferences?: unknown }[]
): Map<string, PipelineEmailPreferences> {
  const map = new Map<string, PipelineEmailPreferences>();
  for (const row of rows) {
    const email = row.email?.trim();
    if (!email) continue;
    map.set(
      normalizeEmail(email),
      parsePipelineEmailPreferences(row.pipeline_email_preferences)
    );
  }
  return map;
}

function isAlwaysEnabledPipelineEmailPreference(
  preferenceKey: PipelineEmailPreferenceKey
): preferenceKey is (typeof ALWAYS_ENABLED_PIPELINE_EMAIL_PREFERENCE_KEYS)[number] {
  return ALWAYS_ENABLED_PIPELINE_EMAIL_PREFERENCE_KEYS.includes(
    preferenceKey as (typeof ALWAYS_ENABLED_PIPELINE_EMAIL_PREFERENCE_KEYS)[number]
  );
}

function isHiddenFromAccountPipelineEmailPreference(
  preferenceKey: PipelineEmailPreferenceKey
): preferenceKey is (typeof HIDDEN_FROM_ACCOUNT_PIPELINE_EMAIL_PREFERENCE_KEYS)[number] {
  return HIDDEN_FROM_ACCOUNT_PIPELINE_EMAIL_PREFERENCE_KEYS.includes(
    preferenceKey as (typeof HIDDEN_FROM_ACCOUNT_PIPELINE_EMAIL_PREFERENCE_KEYS)[number]
  );
}

export function isPipelineEmailEnabledForUser(
  email: string,
  preferenceKey: PipelineEmailPreferenceKey,
  prefsMap: ReadonlyMap<string, PipelineEmailPreferences>
): boolean {
  if (isAlwaysEnabledPipelineEmailPreference(preferenceKey)) {
    return true;
  }

  const prefs = prefsMap.get(normalizeEmail(email));
  if (!prefs) return true;
  return prefs[preferenceKey];
}

export function filterRecipientsByEmailPreference(
  recipients: readonly string[],
  preferenceKey: PipelineEmailPreferenceKey,
  prefsMap: ReadonlyMap<string, PipelineEmailPreferences>
): string[] {
  return recipients.filter((email) =>
    isPipelineEmailEnabledForUser(email, preferenceKey, prefsMap)
  );
}

export function filterConsultantAndProjMgrRecipientsByEmailPreference(input: {
  consultantRecipients: readonly string[];
  projMgrRecipients: readonly string[];
  consultantPreferenceKey: (typeof CONSULTANT_PIPELINE_EMAIL_PREFERENCE_KEYS)[number];
  projMgrPreferenceKey: 'pmReviewStatusChange' | 'pmDueDateChange' | 'pmProjectStatusChange';
  prefsMap: ReadonlyMap<string, PipelineEmailPreferences>;
}): string[] {
  const enabled = new Set<string>();

  for (const email of input.consultantRecipients) {
    if (
      isPipelineEmailEnabledForUser(email, input.consultantPreferenceKey, input.prefsMap)
    ) {
      enabled.add(email);
    }
  }

  for (const email of input.projMgrRecipients) {
    if (isPipelineEmailEnabledForUser(email, input.projMgrPreferenceKey, input.prefsMap)) {
      enabled.add(email);
    }
  }

  return [...enabled];
}

export function getVisiblePipelineEmailPreferenceKeys(
  isProjectManager: boolean
): PipelineEmailPreferenceKey[] {
  const keys = isProjectManager
    ? [...PIPELINE_EMAIL_PREFERENCE_KEYS]
    : [...CONSULTANT_PIPELINE_EMAIL_PREFERENCE_KEYS];

  return keys.filter(
    (key) =>
      !isAlwaysEnabledPipelineEmailPreference(key) &&
      !isHiddenFromAccountPipelineEmailPreference(key)
  );
}

export function isPipelineEmailPreferenceAllowedForUser(
  key: PipelineEmailPreferenceKey,
  isProjectManager: boolean
): boolean {
  if (isAlwaysEnabledPipelineEmailPreference(key)) {
    return false;
  }

  if (isHiddenFromAccountPipelineEmailPreference(key)) {
    return false;
  }

  if (PROJECT_MANAGER_PIPELINE_EMAIL_PREFERENCE_KEYS.includes(
    key as (typeof PROJECT_MANAGER_PIPELINE_EMAIL_PREFERENCE_KEYS)[number]
  )) {
    return isProjectManager;
  }
  return true;
}

export function parsePipelineEmailPreferencesPatch(
  body: unknown,
  options?: { isProjectManager?: boolean }
): Partial<PipelineEmailPreferences> | null {
  if (!isRecord(body)) return null;

  const patch: Partial<PipelineEmailPreferences> = {};
  let hasKey = false;
  const isProjectManager = options?.isProjectManager ?? true;

  for (const key of PIPELINE_EMAIL_PREFERENCE_KEYS) {
    if (key in body) {
      if (typeof body[key] !== 'boolean') return null;
      if (!isPipelineEmailPreferenceAllowedForUser(key, isProjectManager)) return null;
      patch[key] = body[key];
      hasKey = true;
    }
  }

  return hasKey ? patch : null;
}
