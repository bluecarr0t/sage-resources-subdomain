import { PIPELINE_DUE_DATE_REMINDER_TIME_ZONE } from '@/lib/project-pipeline/due-date-reminders/config';

const YMD_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: PIPELINE_DUE_DATE_REMINDER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: PIPELINE_DUE_DATE_REMINDER_TIME_ZONE,
  weekday: 'short',
});

export function formatPipelineReminderDateYmd(date: Date): string {
  return YMD_FORMATTER.format(date);
}

export function parsePipelineReminderYmd(ymd: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = ymd.split('-').map((part) => Number.parseInt(part, 10));
  return { year, month, day };
}

export function addCalendarDaysYmd(ymd: string, days: number): string {
  const { year, month, day } = parsePipelineReminderYmd(ymd);
  const utc = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return YMD_FORMATTER.format(utc);
}

export function isWeekendYmd(ymd: string): boolean {
  const { year, month, day } = parsePipelineReminderYmd(ymd);
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = WEEKDAY_FORMATTER.format(utc);
  return weekday === 'Sat' || weekday === 'Sun';
}

export function isMondayYmd(ymd: string): boolean {
  const { year, month, day } = parsePipelineReminderYmd(ymd);
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return WEEKDAY_FORMATTER.format(utc) === 'Mon';
}

export function subtractBusinessDaysYmd(ymd: string, businessDays: number): string {
  let current = ymd;
  let remaining = businessDays;

  while (remaining > 0) {
    current = addCalendarDaysYmd(current, -1);
    if (!isWeekendYmd(current)) {
      remaining -= 1;
    }
  }

  return current;
}

export function firstBusinessDayAfterYmd(ymd: string): string {
  let current = addCalendarDaysYmd(ymd, 1);
  while (isWeekendYmd(current)) {
    current = addCalendarDaysYmd(current, 1);
  }
  return current;
}

export function isoWeekKeyFromYmd(ymd: string): string {
  const { year, month, day } = parsePipelineReminderYmd(ymd);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
