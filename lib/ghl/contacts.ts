/**
 * GoHighLevel contact helpers for Glamping Market Overview gate leads.
 * Upserts first/last name, email, Contact Type, and the Market Overview tag
 * without replacing other tags already on the contact.
 */

import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';
import {
  gatedAccessBusinessTypeLabel,
  parseGatedAccessBusinessType,
} from '@/lib/gated-access-business-type';
import {
  GhlApiError,
  getGhlAuthConfig,
  ghlFetch,
  type GhlAuthConfig,
} from '@/lib/ghl/client';
import { GHL_GLAMPING_MARKET_OVERVIEW_TAG } from '@/lib/ghl/tags';

export { GHL_GLAMPING_MARKET_OVERVIEW_TAG };

/** Sage location custom field: Contact Type (Investor, Developer, …). */
export const GHL_CONTACT_TYPE_CUSTOM_FIELD_ID = 'pa0ni3ZaoVaYob37OKYx';

export type GhlMarketOverviewContactInput = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  businessType?: string | null;
};

export type GhlContactSyncResult = {
  status: 'created' | 'updated' | 'skipped';
  contactId: string | null;
};

type GhlDuplicateContactResponse = {
  contact?: { id?: string };
  contacts?: Array<{ id?: string }>;
  id?: string;
};

type GhlContactMutationResponse = {
  contact?: { id?: string };
  id?: string;
};

let tagLookupRetryDelaysMs = [0, 750, 2000];

/** Override lookup retry delays (tests only). */
export function setGhlContactTagRetryDelaysForTests(delays: number[]): void {
  tagLookupRetryDelaysMs = delays;
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function contactIdFromPayload(
  payload: GhlDuplicateContactResponse | GhlContactMutationResponse | undefined
): string | null {
  if (!payload) return null;
  const id = payload.contact?.id ?? payload.contacts?.[0]?.id ?? payload.id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function trimName(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function contactTypeCustomField(
  businessType: string | null | undefined
): { id: string; field_value: string } | null {
  const parsed = parseGatedAccessBusinessType(businessType);
  if (!parsed) return null;
  return {
    id: GHL_CONTACT_TYPE_CUSTOM_FIELD_ID,
    field_value: gatedAccessBusinessTypeLabel(parsed),
  };
}

async function findContactIdByEmail(
  config: GhlAuthConfig,
  email: string
): Promise<string | null> {
  const params = new URLSearchParams({
    locationId: config.locationId,
    email,
  });
  try {
    const payload = await ghlFetch<GhlDuplicateContactResponse>(
      config,
      `/contacts/search/duplicate?${params.toString()}`
    );
    return contactIdFromPayload(payload);
  } catch (err) {
    if (err instanceof GhlApiError && (err.status === 400 || err.status === 404)) {
      return null;
    }
    throw err;
  }
}

async function addTagsToContact(
  config: GhlAuthConfig,
  contactId: string,
  tags: string[]
): Promise<void> {
  await ghlFetch(config, `/contacts/${encodeURIComponent(contactId)}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tags }),
  });
}

function nameFields(input: GhlMarketOverviewContactInput): {
  firstName?: string;
  lastName?: string;
} {
  const firstName = trimName(input.firstName);
  const lastName = trimName(input.lastName);
  return {
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
  };
}

/**
 * Find a GHL contact by email and append `tag`. Retries briefly so this can
 * run in parallel with the External Tracking pixel creating the contact.
 * Returns true when the tag was applied.
 */
export async function addGhlContactTagByEmail(
  email: string,
  tag: string
): Promise<boolean> {
  const config = getGhlAuthConfig();
  if (!config) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedTag = tag.trim();
  if (!normalizedEmail || !normalizedTag) return false;

  for (let i = 0; i < tagLookupRetryDelaysMs.length; i += 1) {
    const delay = tagLookupRetryDelaysMs[i] ?? 0;
    if (delay > 0) await sleep(delay);

    const contactId = await findContactIdByEmail(config, normalizedEmail);
    if (!contactId) continue;

    await addTagsToContact(config, contactId, [normalizedTag]);
    return true;
  }

  console.warn(
    `[ghl] Contact not found to tag with "${normalizedTag}" for ${normalizedEmail}`
  );
  return false;
}

/**
 * Create or update a Market Overview contact in GHL. Adds the Market Overview
 * tag without replacing other tags. Skips Contact Type when business type is
 * missing so an existing GHL value is not cleared.
 */
export async function upsertGhlMarketOverviewContact(
  input: GhlMarketOverviewContactInput
): Promise<GhlContactSyncResult> {
  const config = getGhlAuthConfig();
  if (!config) return { status: 'skipped', contactId: null };

  const email = input.email.trim().toLowerCase();
  if (!email) return { status: 'skipped', contactId: null };

  const names = nameFields(input);
  const contactType = contactTypeCustomField(input.businessType);
  const customFields = contactType ? [contactType] : undefined;
  const existingId = await findContactIdByEmail(config, email);

  if (!existingId) {
    const created = await ghlFetch<GhlContactMutationResponse>(config, '/contacts/', {
      method: 'POST',
      body: JSON.stringify({
        locationId: config.locationId,
        email,
        ...names,
        tags: [GHL_GLAMPING_MARKET_OVERVIEW_TAG],
        ...(customFields ? { customFields } : {}),
      }),
    });
    const contactId = contactIdFromPayload(created);
    if (!contactId) {
      throw new Error(`GHL create contact returned no id for ${email}`);
    }
    await addTagsToContact(config, contactId, [GHL_GLAMPING_MARKET_OVERVIEW_TAG]);
    return { status: 'created', contactId };
  }

  await ghlFetch(config, `/contacts/${encodeURIComponent(existingId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...names,
      ...(customFields ? { customFields } : {}),
    }),
  });
  await addTagsToContact(config, existingId, [GHL_GLAMPING_MARKET_OVERVIEW_TAG]);
  return { status: 'updated', contactId: existingId };
}

/** Fire-and-forget sync for Market Overview gate contacts. Never throws to callers. */
export function syncGlampingMarketOverviewContactAsync(
  pageSlug: string,
  input: GhlMarketOverviewContactInput
): void {
  if (pageSlug !== GATED_PAGE_GLAMPING_MARKET_OVERVIEW) return;
  const email = input.email.trim().toLowerCase();
  if (!email) return;

  void upsertGhlMarketOverviewContact({ ...input, email }).catch((err) => {
    console.error('[ghl] Failed to sync Market Overview contact:', err);
  });
}

/** @deprecated Prefer syncGlampingMarketOverviewContactAsync with name + type. */
export function tagGlampingMarketOverviewContactAsync(
  pageSlug: string,
  email: string
): void {
  syncGlampingMarketOverviewContactAsync(pageSlug, { email });
}
