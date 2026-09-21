import {
  CLIENT_PORTAL_REQUEST_STATUSES,
  type ClientPortalRequestStatus,
} from '@/lib/client-portal/constants';

export function isClientPortalRequestStatus(
  value: unknown
): value is ClientPortalRequestStatus {
  return (
    typeof value === 'string' &&
    (CLIENT_PORTAL_REQUEST_STATUSES as readonly string[]).includes(value)
  );
}

export function normalizeClientPortalRequestStatus(
  value: string | null | undefined
): ClientPortalRequestStatus {
  if (isClientPortalRequestStatus(value)) return value;
  return 'open';
}

export function canClientSubmitPortalRequest(
  status: ClientPortalRequestStatus
): boolean {
  switch (status) {
    case 'open':
      return true;
    case 'submitted':
    case 'cleared':
      return false;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function canStaffClearPortalRequest(
  status: ClientPortalRequestStatus
): boolean {
  switch (status) {
    case 'open':
    case 'submitted':
      return true;
    case 'cleared':
      return false;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function clientPortalRequestStatusAfterClientSubmit(
  status: ClientPortalRequestStatus
): ClientPortalRequestStatus | null {
  switch (status) {
    case 'open':
      return 'submitted';
    case 'submitted':
    case 'cleared':
      return null;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function clientPortalRequestStatusAfterStaffClear(
  status: ClientPortalRequestStatus
): ClientPortalRequestStatus | null {
  switch (status) {
    case 'open':
    case 'submitted':
      return 'cleared';
    case 'cleared':
      return null;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
