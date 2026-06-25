import type { calendar_v3 } from 'googleapis';
import { buildJobPipelineAdminUrl } from '@/lib/email/pipeline-email-templates';
import { parseProjectPipelineDueDate } from '@/lib/project-pipeline/due-date-emphasis';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

const REVIEW_BLOCK_MINUTES = 30;
const DEFAULT_REVIEW_HOUR = 9;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatZonedDateParts(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function getZonedWeekdayShort(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
}

function zonedDateTimeToInstant(date: string, time: string, timeZone: string): number {
  let instant = Date.parse(`${date}T${time}:00Z`);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(instant));
    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const formattedDate = `${lookup.year}-${lookup.month}-${lookup.day}`;
    const formattedTime = `${lookup.hour}:${lookup.minute}`;
    const desiredMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    const actualMinutes = Number(formattedTime.slice(0, 2)) * 60 + Number(formattedTime.slice(3, 5));
    const dayOffset =
      Date.parse(`${formattedDate}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`);
    const deltaMinutes = dayOffset / 60_000 + (actualMinutes - desiredMinutes);
    if (formattedDate === date && formattedTime === time) {
      return instant;
    }
    instant -= deltaMinutes * 60_000;
  }
  return instant;
}

export function dueDateSheetValueToIsoDate(dueDate: string): string | null {
  const dueMs = parseProjectPipelineDueDate(dueDate);
  if (dueMs == null) return null;
  const due = new Date(dueMs);
  return `${due.getUTCFullYear()}-${pad(due.getUTCMonth() + 1)}-${pad(due.getUTCDate())}`;
}

export function resolvePipelineReviewCalendarStartParts(
  dueDate: string,
  now: Date = new Date(),
  timeZone = 'America/New_York'
): { date: string; time: string } {
  const defaultTime = `${pad(DEFAULT_REVIEW_HOUR)}:00`;
  const dueDatePart = dueDateSheetValueToIsoDate(dueDate);

  if (dueDatePart) {
    const candidateInstant = zonedDateTimeToInstant(dueDatePart, defaultTime, timeZone);
    if (candidateInstant >= now.getTime()) {
      return { date: dueDatePart, time: defaultTime };
    }
  }

  let cursor = new Date(now.getTime());
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (getZonedWeekdayShort(cursor, timeZone) === 'Sat' || getZonedWeekdayShort(cursor, timeZone) === 'Sun') {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    date: formatZonedDateParts(cursor, timeZone),
    time: defaultTime,
  };
}

function addMinutesToLocalDateTime(
  date: string,
  time: string,
  minutes: number
): { date: string; time: string } {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + minutes;
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const remainder = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const endDate = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return {
    date: `${endDate.getUTCFullYear()}-${pad(endDate.getUTCMonth() + 1)}-${pad(endDate.getUTCDate())}`,
    time: `${pad(Math.floor(remainder / 60))}:${pad(remainder % 60)}`,
  };
}

export function buildPipelineReviewCalendarEvent(input: {
  job: ProjectPipelineJob;
  actorDisplayName: string;
  note?: string;
  resubmit?: boolean;
  recipientEmail: string;
  timeZone?: string;
  now?: Date;
  siteUrl?: string;
}): calendar_v3.Schema$Event {
  const timeZone = input.timeZone ?? 'America/New_York';
  const client = input.job.client?.trim() || 'Unknown client';
  const resubmit = Boolean(input.resubmit);
  const summary = `${resubmit ? 'Resubmit review' : 'Review'}: Job #${input.job.jobNumber} — ${client}`;
  const jobPipelineUrl = buildJobPipelineAdminUrl(input.siteUrl);

  const descriptionLines = [
    `${input.actorDisplayName} ${resubmit ? 'resubmitted' : 'submitted'} this project for review.`,
    '',
    `Job #: ${input.job.jobNumber}`,
    `Client: ${input.job.client || '—'}`,
    `Property: ${input.job.propertyLocation || '—'}`,
    `Consultant: ${input.job.appraiserConsultant || '—'}`,
    `Due date: ${input.job.dueDate || '—'}`,
  ];

  if (input.note?.trim()) {
    descriptionLines.push('', `Note: ${input.note.trim()}`);
  }

  descriptionLines.push('', `Open Job Pipeline: ${jobPipelineUrl}`);

  const startParts = resolvePipelineReviewCalendarStartParts(
    input.job.dueDate,
    input.now,
    timeZone
  );
  const endParts = addMinutesToLocalDateTime(
    startParts.date,
    startParts.time,
    REVIEW_BLOCK_MINUTES
  );

  const sheetTab = input.job.pipelineSheetName?.trim() || 'pipeline';
  const iCalUID = `sage-pipeline-review-${sheetTab}-${input.job.jobNumber}@sageoutdooradvisory.com`;

  return {
    summary,
    description: descriptionLines.join('\n'),
    start: {
      dateTime: `${startParts.date}T${startParts.time}:00`,
      timeZone,
    },
    end: {
      dateTime: `${endParts.date}T${endParts.time}:00`,
      timeZone,
    },
    iCalUID,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 15 },
        { method: 'email', minutes: 60 },
      ],
    },
    extendedProperties: {
      private: {
        sagePipelineJobNumber: input.job.jobNumber,
        sagePipelineSheet: sheetTab,
        sagePipelineReviewRecipient: input.recipientEmail,
      },
    },
  };
}
