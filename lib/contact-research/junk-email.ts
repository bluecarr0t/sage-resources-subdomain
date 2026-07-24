/**
 * Block transactional / noreply-style addresses that are not useful CRM contacts.
 */

const LOCAL_PART_BLOCKLIST = [
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'mailer-daemon',
  'postmaster',
  'notifications',
  'notification',
  'bounce',
  'bounces',
  'support+auto',
];

const DOMAIN_BLOCKLIST = [
  'docusign.net',
  'camail.docusign.net',
  'notification.intuit.com',
  'email.apple.com',
  'amazonses.com',
  'sendgrid.net',
  'mailchimp.com',
  'mandrillapp.com',
  'sparkpostmail.com',
  'googleusercontent.com',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailShape(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isJunkEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!isValidEmailShape(normalized)) return true;

  const at = normalized.lastIndexOf('@');
  if (at < 1) return true;

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);

  if (LOCAL_PART_BLOCKLIST.some((b) => local === b || local.startsWith(`${b}+`))) {
    return true;
  }

  if (DOMAIN_BLOCKLIST.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return true;
  }

  if (local.includes('noreply') || local.includes('no-reply') || local.includes('donotreply')) {
    return true;
  }

  return false;
}

/** Prefer person-like local parts over generic inboxes when ranking candidates. */
export function isGenericInbox(email: string): boolean {
  const local = normalizeEmail(email).split('@')[0] ?? '';
  return [
    'info',
    'hello',
    'contact',
    'admin',
    'office',
    'sales',
    'reservations',
    'booking',
    'bookings',
    'enquiries',
    'inquiry',
    'inquiries',
    'support',
    'team',
  ].includes(local);
}
