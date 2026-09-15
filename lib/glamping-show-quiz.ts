/**
 * Glamping Show booth quiz — scoring, GHL tags, and result copy.
 * Unlisted: not in nav, sitemap, or robots allowlist.
 */

import { RESOURCES_ROOT_CONTACT_BASE } from '@/lib/root-domain-attribution';
import type { GatedAccessBusinessType } from '@/lib/gated-access-business-type';
import {
  GHL_GLAMPING_SHOW_QUIZ_TAG,
  GHL_QUIZ_GETTING_CLOSE_TAG,
  GHL_QUIZ_JUST_EXPLORING_TAG,
  GHL_QUIZ_READY_NOW_TAG,
} from '@/lib/ghl/tags';
import { CA_PROVINCE_DISPLAY_NAME } from '@/lib/normalize-ca-province-key';
import { getResourcesSiteOrigin } from '@/lib/site-url';
import { US_STATES_OPTIONS } from '@/lib/us-states';

export const GLAMPING_SHOW_QUIZ_PATH = '/glamping-show-quiz';

/** Idle timeout on questions and the contact form. Result uses a longer window for QR scans. */
export const QUIZ_IDLE_RESET_MS = 60_000;
export const QUIZ_RESULT_IDLE_RESET_MS = 90_000;

export const QUIZ_FLOW_STEPS = [
  'welcome',
  'role',
  'stage',
  'need',
  'timeline',
  'contact',
  'result',
] as const;

export type QuizFlowStep = (typeof QUIZ_FLOW_STEPS)[number];

export function quizIdleResetMs(step: QuizFlowStep): number | null {
  switch (step) {
    case 'welcome':
      return null;
    case 'result':
      return QUIZ_RESULT_IDLE_RESET_MS;
    case 'role':
    case 'stage':
    case 'need':
    case 'timeline':
    case 'contact':
      return QUIZ_IDLE_RESET_MS;
    default: {
      const _exhaustive: never = step;
      return _exhaustive;
    }
  }
}

export const GLAMPING_SHOW_QUIZ_TITLE =
  'Is your outdoor hospitality project ready for Sage?';

export const GLAMPING_SHOW_QUIZ_DURATION_LABEL = 'Takes less than 60 seconds';

export const GLAMPING_SHOW_QUIZ_UTM = {
  utm_source: 'glamping_show',
  utm_medium: 'booth_quiz',
  utm_campaign: 'gsa_2026',
} as const;

export const GLAMPING_SHOW_QUIZ_SOURCE = 'glamping-show-quiz';

export const QUIZ_ROLES = [
  'landowner',
  'developer_operator',
  'existing_operator',
  'investor_lender',
  'vendor_media',
] as const;

export type QuizRole = (typeof QUIZ_ROLES)[number];

export const QUIZ_STAGES = [
  'idea',
  'has_land',
  'has_plans',
  'operating',
] as const;

export type QuizStage = (typeof QUIZ_STAGES)[number];

export const QUIZ_NEEDS = [
  'feasibility',
  'appraisal',
  'market_data',
  'exploring',
] as const;

export type QuizNeed = (typeof QUIZ_NEEDS)[number];

export const QUIZ_TIMELINES = [
  '30_days',
  '1_to_3_months',
  '3_to_12_months',
  'no_timeline',
] as const;

export type QuizTimeline = (typeof QUIZ_TIMELINES)[number];

export const QUIZ_OUTCOMES = [
  'ready_now',
  'getting_close',
  'just_exploring',
] as const;

export type QuizOutcome = (typeof QUIZ_OUTCOMES)[number];

const ROLE_SET = new Set<string>(QUIZ_ROLES);
const STAGE_SET = new Set<string>(QUIZ_STAGES);
const NEED_SET = new Set<string>(QUIZ_NEEDS);
const TIMELINE_SET = new Set<string>(QUIZ_TIMELINES);

export type QuizAnswers = {
  role: QuizRole;
  stage: QuizStage;
  need: QuizNeed;
  timeline: QuizTimeline;
};

export type QuizOption<T extends string> = {
  value: T;
  label: string;
};

export const QUIZ_ROLE_OPTIONS: readonly QuizOption<QuizRole>[] = [
  { value: 'landowner', label: 'Landowner exploring an outdoor hospitality concept' },
  { value: 'developer_operator', label: 'Developer or operator with a project in motion' },
  { value: 'existing_operator', label: 'Existing operator looking to expand, refinance, or sell' },
  { value: 'investor_lender', label: 'Investor or lender evaluating a deal' },
  { value: 'vendor_media', label: 'Vendor, media, or other' },
];

export const QUIZ_STAGE_OPTIONS: readonly QuizOption<QuizStage>[] = [
  { value: 'idea', label: 'Idea stage, no land yet' },
  { value: 'has_land', label: 'Have land, need to know if it pencils' },
  { value: 'has_plans', label: 'Have plans, need financing or an appraisal' },
  { value: 'operating', label: 'Already operating, want market data or growth strategy' },
];

export const QUIZ_NEED_OPTIONS: readonly QuizOption<QuizNeed>[] = [
  { value: 'feasibility', label: 'Feasibility study' },
  { value: 'appraisal', label: 'Appraisal or valuation' },
  { value: 'market_data', label: 'Market and competitive data (rates, occupancy, dev costs)' },
  { value: 'exploring', label: 'Not sure, just exploring' },
];

export const QUIZ_TIMELINE_OPTIONS: readonly QuizOption<QuizTimeline>[] = [
  { value: '30_days', label: 'Next 30 days' },
  { value: '1_to_3_months', label: '1 to 3 months' },
  { value: '3_to_12_months', label: '3 to 12 months' },
  { value: 'no_timeline', label: 'No timeline, researching' },
];

const ROLE_TAGS: Record<QuizRole, string> = {
  landowner: 'Quiz - Landowner',
  developer_operator: 'Quiz - Developer/Operator',
  existing_operator: 'Quiz - Existing Operator',
  investor_lender: 'Quiz - Investor/Lender',
  vendor_media: 'Quiz - Vendor/Media',
};

const STAGE_TAGS: Record<QuizStage, string> = {
  idea: 'Quiz - Idea Stage',
  has_land: 'Quiz - Has Land',
  has_plans: 'Quiz - Has Plans',
  operating: 'Quiz - Operating',
};

const NEED_TAGS: Record<QuizNeed, string> = {
  feasibility: 'Quiz - Feasibility',
  appraisal: 'Quiz - Appraisal',
  market_data: 'Quiz - Market Data',
  exploring: 'Quiz - Exploring',
};

const TIMELINE_TAGS: Record<QuizTimeline, string> = {
  '30_days': 'Quiz - 30 Days',
  '1_to_3_months': 'Quiz - 1-3 Months',
  '3_to_12_months': 'Quiz - 3-12 Months',
  no_timeline: 'Quiz - No Timeline',
};

const OUTCOME_TAGS: Record<QuizOutcome, string> = {
  ready_now: GHL_QUIZ_READY_NOW_TAG,
  getting_close: GHL_QUIZ_GETTING_CLOSE_TAG,
  just_exploring: GHL_QUIZ_JUST_EXPLORING_TAG,
};

/** Q1 → existing GHL Contact Type when the mapping is unambiguous. */
const ROLE_CONTACT_TYPE: Record<QuizRole, GatedAccessBusinessType> = {
  landowner: 'other',
  developer_operator: 'developer',
  existing_operator: 'operator',
  investor_lender: 'investor',
  vendor_media: 'other',
};

export function isQuizRole(value: unknown): value is QuizRole {
  return typeof value === 'string' && ROLE_SET.has(value);
}

export function isQuizStage(value: unknown): value is QuizStage {
  return typeof value === 'string' && STAGE_SET.has(value);
}

export function isQuizNeed(value: unknown): value is QuizNeed {
  return typeof value === 'string' && NEED_SET.has(value);
}

export function isQuizTimeline(value: unknown): value is QuizTimeline {
  return typeof value === 'string' && TIMELINE_SET.has(value);
}

export function parseQuizAnswers(body: {
  role?: unknown;
  stage?: unknown;
  need?: unknown;
  timeline?: unknown;
}): QuizAnswers | null {
  if (
    !isQuizRole(body.role) ||
    !isQuizStage(body.stage) ||
    !isQuizNeed(body.need) ||
    !isQuizTimeline(body.timeline)
  ) {
    return null;
  }
  return {
    role: body.role,
    stage: body.stage,
    need: body.need,
    timeline: body.timeline,
  };
}

function isLandOrPlans(stage: QuizStage): boolean {
  return stage === 'has_land' || stage === 'has_plans';
}

function isWithinThreeMonths(timeline: QuizTimeline): boolean {
  return timeline === '30_days' || timeline === '1_to_3_months';
}

function isSageEngagementNeed(need: QuizNeed): boolean {
  return need === 'feasibility' || need === 'appraisal';
}

/**
 * Ready now is a Sage engagement this quarter: not vendor/media, a study
 * (feasibility or appraisal), land or plans, and a sub-three-month clock.
 * Just exploring is vendor/media, “not sure”, idea stage, or no timeline.
 * Market-data asks, later clocks, and operating businesses are getting close.
 */
export function resolveQuizOutcome(answers: QuizAnswers): QuizOutcome {
  if (answers.role === 'vendor_media' || answers.need === 'exploring') {
    return 'just_exploring';
  }
  if (
    isSageEngagementNeed(answers.need) &&
    isLandOrPlans(answers.stage) &&
    isWithinThreeMonths(answers.timeline)
  ) {
    return 'ready_now';
  }
  if (answers.stage === 'idea' || answers.timeline === 'no_timeline') {
    return 'just_exploring';
  }
  if (isLandOrPlans(answers.stage) || answers.stage === 'operating') {
    return 'getting_close';
  }
  return 'just_exploring';
}

export function quizRoleContactType(role: QuizRole): GatedAccessBusinessType {
  return ROLE_CONTACT_TYPE[role];
}

export function ghlTagsForQuizAnswers(
  answers: QuizAnswers,
  outcome: QuizOutcome
): string[] {
  return [
    GHL_GLAMPING_SHOW_QUIZ_TAG,
    ROLE_TAGS[answers.role],
    STAGE_TAGS[answers.stage],
    NEED_TAGS[answers.need],
    TIMELINE_TAGS[answers.timeline],
    OUTCOME_TAGS[outcome],
  ];
}

const QUIZ_REPLACEABLE_TAGS = [
  ...Object.values(ROLE_TAGS),
  ...Object.values(STAGE_TAGS),
  ...Object.values(NEED_TAGS),
  ...Object.values(TIMELINE_TAGS),
  ...Object.values(OUTCOME_TAGS),
];

/** Quiz dimension/outcome tags to strip so a retake does not stack Ready Now with Just Exploring. */
export function ghlQuizTagsToRemove(keep: readonly string[]): string[] {
  const keepSet = new Set(keep);
  return QUIZ_REPLACEABLE_TAGS.filter((tag) => !keepSet.has(tag));
}

function withQuizUtm(url: string, content: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('utm_source', GLAMPING_SHOW_QUIZ_UTM.utm_source);
  parsed.searchParams.set('utm_medium', GLAMPING_SHOW_QUIZ_UTM.utm_medium);
  parsed.searchParams.set('utm_campaign', GLAMPING_SHOW_QUIZ_UTM.utm_campaign);
  parsed.searchParams.set('utm_content', content);
  return parsed.toString();
}

export function quizCalendarUrl(): string {
  return withQuizUtm(RESOURCES_ROOT_CONTACT_BASE, 'glamping_show_quiz');
}

export function quizMarketOverviewUrl(content = 'getting_close'): string {
  return withQuizUtm(
    `${getResourcesSiteOrigin()}/glamping-market-overview`,
    content
  );
}

export function quizResourcesHomeUrl(): string {
  return withQuizUtm(`${getResourcesSiteOrigin()}/`, 'getting_close_home');
}

export function quizRvMarketReportUrl(): string {
  return withQuizUtm('https://sageoutdooradvisory.com/shop/', 'rv_market_report');
}

export type QuizResultCopy = {
  outcome: QuizOutcome;
  headline: string;
  body: string;
  footnote?: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  qrHint: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
};

export function quizResultCopy(
  outcome: QuizOutcome,
  need: QuizNeed
): QuizResultCopy {
  switch (outcome) {
    case 'ready_now':
      return {
        outcome,
        headline: 'You’re at the stage where Sage delivers the most value.',
        body: readyNowBody(need),
        footnote: 'A team member will follow up within 48 hours.',
        primaryCtaLabel: 'Schedule a meeting',
        primaryCtaUrl: quizCalendarUrl(),
        qrHint: 'Scan with your phone',
      };
    case 'getting_close':
      return {
        outcome,
        headline: 'Start with the data.',
        body: 'Grab the free 2026 Glamping Market Overview and the Q4 2025 USA RV Market Report. We’ll check in as your timeline firms up.',
        primaryCtaLabel: 'Glamping Market Overview',
        primaryCtaUrl: quizMarketOverviewUrl(),
        qrHint: 'Scan with your phone',
        secondaryCtaLabel: 'USA RV Market Report',
        secondaryCtaUrl: quizRvMarketReportUrl(),
      };
    case 'just_exploring':
      return {
        outcome,
        headline: 'You’re early, and that’s the right time to learn the market.',
        body: 'Start with the free 2026 Glamping Market Overview. Scan to open it on your phone.',
        primaryCtaLabel: 'Glamping Market Overview',
        primaryCtaUrl: quizMarketOverviewUrl('just_exploring'),
        qrHint: 'Scan with your phone',
      };
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

function readyNowBody(need: QuizNeed): string {
  switch (need) {
    case 'feasibility':
      return 'Book a complimentary consultation with our team. Sage feasibility studies show whether the project pencils before you spend on plans, construction, or financing.';
    case 'appraisal':
      return 'Book a complimentary consultation with our team. Sage appraisals are bank-accepted, the documentation lenders use to close outdoor hospitality loans.';
    case 'market_data':
      return 'Book a complimentary consultation with our team. We’ll walk through the market data and what it means for your next step.';
    case 'exploring':
      return 'Book a complimentary consultation with our team. We’ll help you sort feasibility, valuation, and market data so you know where to start.';
    default: {
      const _exhaustive: never = need;
      return _exhaustive;
    }
  }
}

const PHONE_DIGIT_MIN = 7;
const PHONE_DIGIT_MAX = 15;
const COMPANY_MAX_LENGTH = 120;

/** Trimmed phone, empty string when omitted, or null when invalid. */
export function parseOptionalPhone(value: unknown): string | null {
  if (value == null) return '';
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < PHONE_DIGIT_MIN || digits.length > PHONE_DIGIT_MAX) {
    return null;
  }
  return trimmed;
}

export function quizPhoneRequired(outcome: QuizOutcome): boolean {
  return outcome === 'ready_now';
}

/** Required on Ready Now so booth staff can text or call. Empty string when optional and omitted. */
export function parseQuizPhone(value: unknown, required: boolean): string | null {
  const parsed = parseOptionalPhone(value);
  if (parsed === null) return null;
  if (required && parsed === '') return null;
  return parsed;
}

export function formatQuizIdleCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Empty string when omitted; null when the value is invalid. */
export function parseQuizCompany(value: unknown): string | null {
  if (value == null) return '';
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  if (trimmed.length > COMPANY_MAX_LENGTH) return null;
  return trimmed;
}

export const QUIZ_REGION_OTHER = 'Other';

export const QUIZ_US_REGION_OPTIONS: readonly QuizOption<string>[] = [
  ...US_STATES_OPTIONS,
  { value: 'DC', label: 'District of Columbia' },
].sort((a, b) => a.label.localeCompare(b.label));

export const QUIZ_CA_REGION_OPTIONS: readonly QuizOption<string>[] = (
  Object.keys(CA_PROVINCE_DISPLAY_NAME) as Array<keyof typeof CA_PROVINCE_DISPLAY_NAME>
)
  .map((code) => ({ value: code, label: CA_PROVINCE_DISPLAY_NAME[code] }))
  .sort((a, b) => a.label.localeCompare(b.label));

const QUIZ_REGION_VALUES = new Set<string>([
  ...QUIZ_US_REGION_OPTIONS.map((option) => option.value),
  ...QUIZ_CA_REGION_OPTIONS.map((option) => option.value),
  QUIZ_REGION_OTHER,
]);

/** USPS / CA province code, or Other. Null when missing or unknown. */
export function parseQuizRegion(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!QUIZ_REGION_VALUES.has(trimmed)) return null;
  return trimmed;
}
