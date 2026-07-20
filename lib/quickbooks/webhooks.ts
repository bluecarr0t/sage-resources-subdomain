import { createHmac, timingSafeEqual } from 'crypto';

export function verifyQuickbooksWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null | undefined;
  verifierToken: string;
}): boolean {
  if (!input.signatureHeader || !input.verifierToken) return false;

  const digest = createHmac('sha256', input.verifierToken)
    .update(input.rawBody, 'utf8')
    .digest('base64');

  const expected = Buffer.from(digest);
  const received = Buffer.from(input.signatureHeader);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export type QuickbooksWebhookEntity = {
  name?: string;
  id?: string;
  operation?: string;
  lastUpdated?: string;
};

export type QuickbooksWebhookNotification = {
  realmId?: string;
  dataChangeEvent?: {
    entities?: QuickbooksWebhookEntity[];
  };
};

export type QuickbooksWebhookPayload = {
  eventNotifications?: QuickbooksWebhookNotification[];
};

export function collectInvoiceIdsFromWebhookPayload(
  payload: QuickbooksWebhookPayload,
  expectedRealmId?: string | null
): string[] {
  const ids = new Set<string>();
  for (const notification of payload.eventNotifications ?? []) {
    if (
      expectedRealmId &&
      notification.realmId &&
      notification.realmId !== expectedRealmId
    ) {
      continue;
    }
    for (const entity of notification.dataChangeEvent?.entities ?? []) {
      if (entity.name !== 'Invoice' || !entity.id) continue;
      if (entity.operation === 'Delete') continue;
      ids.add(entity.id);
    }
  }
  return [...ids];
}
