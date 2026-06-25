import type { ManagedUser } from '@/lib/auth-helpers';

export type ManagedUserDivision = 'outdoor' | 'commercial' | 'both';

export function toManagedUserDivisionSelectValue(
  division: ManagedUser['division']
): ManagedUserDivision {
  if (division === 'outdoor' || division === 'commercial') return division;
  return 'both';
}

export function fromManagedUserDivisionSelectValue(value: string): ManagedUserDivision {
  if (value === 'outdoor' || value === 'commercial' || value === 'both') return value;
  return 'both';
}

/** Whether a managed user's division should appear for a pipeline segment filter. */
export function managedUserDivisionMatchesSegmentFilter(
  division: string | null | undefined,
  segmentFilter: string
): boolean {
  if (!segmentFilter) return true;

  const normalized = division?.trim().toLowerCase();
  if (!normalized || normalized === 'both') return true;
  if (segmentFilter === 'Outdoor') return normalized === 'outdoor';
  if (segmentFilter === 'Commercial') return normalized === 'commercial';
  return true;
}

export function isBothManagedUserDivision(division: string | null | undefined): boolean {
  const normalized = division?.trim().toLowerCase();
  return !normalized || normalized === 'both';
}
