const MOUNTAIN_TZ = 'America/Denver';
const CENTRAL_TZ = 'America/Chicago';

type ZonedParts = {
  weekday: string;
  month: string;
  day: string;
  year: string;
  hour: string;
  minute: string;
  dayPeriod: string;
  timeZoneName: string;
};

function lookupParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    weekday: lookup.weekday ?? '',
    month: lookup.month ?? '',
    day: lookup.day ?? '',
    year: lookup.year ?? '',
    hour: lookup.hour ?? '',
    minute: lookup.minute ?? '',
    dayPeriod: (lookup.dayPeriod ?? '').toUpperCase(),
    timeZoneName: lookup.timeZoneName ?? '',
  };
}

function formatDateLabel(parts: ZonedParts): string {
  return `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year}`;
}

function formatTimeLabel(parts: ZonedParts): string {
  return `${parts.hour}:${parts.minute} ${parts.dayPeriod} ${parts.timeZoneName}`;
}

function sameCalendarDay(left: ZonedParts, right: ZonedParts): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

/**
 * Formats a submission timestamp for client-facing Review Submission receipts.
 * Always shows Mountain and Central (with DST-aware MDT/MST and CDT/CST).
 *
 * Same calendar day: `Monday, August 3, 2026 at 12:48 AM MDT / 1:48 AM CDT`
 * Cross-midnight: full date+time for each zone.
 */
export function formatSubmissionTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const mountain = lookupParts(date, MOUNTAIN_TZ);
  const central = lookupParts(date, CENTRAL_TZ);

  if (sameCalendarDay(mountain, central)) {
    return `${formatDateLabel(mountain)} at ${formatTimeLabel(mountain)} / ${formatTimeLabel(central)}`;
  }

  return `${formatDateLabel(mountain)} at ${formatTimeLabel(mountain)} / ${formatDateLabel(central)} at ${formatTimeLabel(central)}`;
}
