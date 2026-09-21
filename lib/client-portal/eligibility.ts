import { isValidEmail } from '@/lib/gated-access';
import { jobMatchesProjectPipelineSegment } from '@/lib/project-pipeline/segment';
import { CLIENT_PORTAL_SERVICES } from '@/lib/client-portal/constants';

export type ClientPortalEligibilityInput = {
  commercialOutdoor: string | null | undefined;
  service: string | null | undefined;
  contractStart: string | null | undefined;
  clientEmail: string | null | undefined;
};

export type ClientPortalEligibilityReason =
  | 'not_outdoor'
  | 'unsupported_service'
  | 'missing_contract'
  | 'invalid_email';

export function isClientPortalService(service: string | null | undefined): boolean {
  const trimmed = service?.trim();
  return Boolean(
    trimmed && (CLIENT_PORTAL_SERVICES as readonly string[]).includes(trimmed)
  );
}

export function getClientPortalEligibilityReasons(
  input: ClientPortalEligibilityInput
): ClientPortalEligibilityReason[] {
  const reasons: ClientPortalEligibilityReason[] = [];
  if (!jobMatchesProjectPipelineSegment(input.commercialOutdoor, 'Outdoor')) {
    reasons.push('not_outdoor');
  }
  if (!isClientPortalService(input.service)) {
    reasons.push('unsupported_service');
  }
  if (!input.contractStart?.trim()) {
    reasons.push('missing_contract');
  }
  const email = input.clientEmail?.trim().toLowerCase() ?? '';
  if (!isValidEmail(email)) {
    reasons.push('invalid_email');
  }
  return reasons;
}

export function isClientPortalJobEligible(
  input: ClientPortalEligibilityInput
): boolean {
  return getClientPortalEligibilityReasons(input).length === 0;
}

export function normalizeClientPortalEmail(
  email: string | null | undefined
): string {
  return email?.trim().toLowerCase() ?? '';
}

export function clientEmailMatchesInvited(
  sessionEmail: string | null | undefined,
  invitedEmail: string | null | undefined
): boolean {
  const session = normalizeClientPortalEmail(sessionEmail);
  const invited = normalizeClientPortalEmail(invitedEmail);
  return Boolean(session && invited && session === invited);
}

export function canClientAccessPortalJob(input: {
  isStaff: boolean;
  eligible: boolean;
  sessionEmail: string | null | undefined;
  engagement: { enabled: boolean; invitedEmail: string } | null;
}): boolean {
  if (input.isStaff) return true;
  if (!input.eligible || !input.engagement?.enabled) return false;
  return clientEmailMatchesInvited(input.sessionEmail, input.engagement.invitedEmail);
}
