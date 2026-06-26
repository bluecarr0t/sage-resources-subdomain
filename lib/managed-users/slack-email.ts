export type ManagedUserSlackEmailRow = {
  email?: string | null;
  slack_email?: string | null;
};

export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeSlackEmailInput(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase() ?? '';
  return trimmed || null;
}

export function isValidSlackEmailInput(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Delivery address for Slack DMs — prefers verified slack_email over login email. */
export function resolveSlackDeliveryEmail(row: ManagedUserSlackEmailRow): string | null {
  const accountEmail = row.email?.trim();
  if (!accountEmail) return null;
  return row.slack_email?.trim() || accountEmail;
}

export function resolveSlackDeliveryEmailForAccount(
  accountEmail: string,
  rows: readonly ManagedUserSlackEmailRow[]
): string | null {
  const normalized = normalizeAccountEmail(accountEmail);
  for (const row of rows) {
    if (normalizeAccountEmail(row.email ?? '') !== normalized) continue;
    return resolveSlackDeliveryEmail(row);
  }
  return accountEmail.trim() || null;
}

export function buildSlackDeliveryEmailMap(
  rows: readonly ManagedUserSlackEmailRow[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const accountEmail = row.email?.trim();
    const delivery = resolveSlackDeliveryEmail(row);
    if (!accountEmail || !delivery) continue;
    map.set(normalizeAccountEmail(accountEmail), delivery);
  }
  return map;
}

export function resolveSlackDeliveryEmailsForAccounts(
  accountEmails: readonly string[],
  rows: readonly ManagedUserSlackEmailRow[]
): string[] {
  const deliveryMap = buildSlackDeliveryEmailMap(rows);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const accountEmail of accountEmails) {
    const normalized = normalizeAccountEmail(accountEmail);
    const delivery =
      deliveryMap.get(normalized) ?? accountEmail.trim();
    if (!delivery) continue;
    const deliveryKey = normalizeAccountEmail(delivery);
    if (seen.has(deliveryKey)) continue;
    seen.add(deliveryKey);
    result.push(delivery);
  }

  return result;
}
