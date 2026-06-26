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

/** Text color for division selects on /admin/users (! overrides Select base gray). */
export function getManagedUserDivisionSelectTextClassName(
  division: ManagedUser['division'] | ManagedUserDivision
): string {
  const value = toManagedUserDivisionSelectValue(division);
  if (value === 'outdoor') {
    return 'font-semibold !text-green-700 dark:!text-green-400';
  }
  if (value === 'commercial') {
    return 'font-semibold !text-yellow-600 dark:!text-yellow-400';
  }
  return 'font-semibold !text-purple-700 dark:!text-purple-400';
}

export function resolveManagedUserFirstNameSortKey(
  user: Pick<ManagedUser, 'first_name' | 'display_name' | 'email'>
): string {
  const fromFirst = user.first_name?.trim();
  if (fromFirst) return fromFirst.toLowerCase();

  const display = user.display_name?.trim();
  if (display) {
    const firstToken = display.split(/\s+/)[0];
    if (firstToken) return firstToken.toLowerCase();
  }

  const local = user.email.split('@')[0] ?? '';
  return local.toLowerCase();
}

export function compareManagedUsersByFirstName(
  left: Pick<ManagedUser, 'first_name' | 'last_name' | 'display_name' | 'email'>,
  right: Pick<ManagedUser, 'first_name' | 'last_name' | 'display_name' | 'email'>
): number {
  const firstCompare = resolveManagedUserFirstNameSortKey(left).localeCompare(
    resolveManagedUserFirstNameSortKey(right),
    undefined,
    { sensitivity: 'base' }
  );
  if (firstCompare !== 0) return firstCompare;

  const lastLeft = (
    left.last_name?.trim() ||
    left.display_name?.trim().split(/\s+/).slice(1).join(' ') ||
    ''
  ).toLowerCase();
  const lastRight = (
    right.last_name?.trim() ||
    right.display_name?.trim().split(/\s+/).slice(1).join(' ') ||
    ''
  ).toLowerCase();
  const lastCompare = lastLeft.localeCompare(lastRight, undefined, { sensitivity: 'base' });
  if (lastCompare !== 0) return lastCompare;

  return left.email.localeCompare(right.email, undefined, { sensitivity: 'base' });
}

export function sortManagedUsersByFirstName<
  T extends Pick<ManagedUser, 'first_name' | 'last_name' | 'display_name' | 'email'>,
>(users: readonly T[]): T[] {
  return [...users].sort(compareManagedUsersByFirstName);
}
