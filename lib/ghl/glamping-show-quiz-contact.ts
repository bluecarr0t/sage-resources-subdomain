/**
 * Upsert Glamping Show booth quiz leads into GoHighLevel.
 * On update, strips stale quiz dimension/outcome tags before adding the current set
 * so a retake cannot stack Ready Now with Just Exploring.
 */

import {
  GHL_CONTACT_TYPE_CUSTOM_FIELD_ID,
  addTagsToContact,
  findContactIdByEmail,
  removeTagsFromContact,
  type GhlContactSyncResult,
} from '@/lib/ghl/contacts';
import { getGhlAuthConfig, ghlFetch } from '@/lib/ghl/client';
import { gatedAccessBusinessTypeLabel } from '@/lib/gated-access-business-type';
import {
  ghlQuizTagsToRemove,
  ghlTagsForQuizAnswers,
  quizRoleContactType,
  type QuizAnswers,
  type QuizOutcome,
} from '@/lib/glamping-show-quiz';
import { GHL_GLAMPING_SHOW_QUIZ_TAG } from '@/lib/ghl/tags';

export type GhlGlampingShowQuizContactInput = {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  region: string;
  phone?: string;
  answers: QuizAnswers;
  outcome: QuizOutcome;
};

type GhlContactIdPayload = {
  contact?: { id?: string };
  contacts?: Array<{ id?: string }>;
  id?: string;
};

function contactIdFromPayload(
  payload: GhlContactIdPayload | undefined
): string | null {
  if (!payload) return null;
  const id = payload.contact?.id ?? payload.contacts?.[0]?.id ?? payload.id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function quizCustomFields(input: GhlGlampingShowQuizContactInput): Array<{
  id: string;
  field_value: string;
}> {
  return [
    {
      id: GHL_CONTACT_TYPE_CUSTOM_FIELD_ID,
      field_value: gatedAccessBusinessTypeLabel(quizRoleContactType(input.answers.role)),
    },
  ];
}

export async function upsertGhlGlampingShowQuizContact(
  input: GhlGlampingShowQuizContactInput
): Promise<GhlContactSyncResult> {
  const config = getGhlAuthConfig();
  if (!config) return { status: 'skipped', contactId: null };

  const email = input.email.trim().toLowerCase();
  if (!email) return { status: 'skipped', contactId: null };

  const tags = ghlTagsForQuizAnswers(input.answers, input.outcome);
  const customFields = quizCustomFields(input);
  const phone = input.phone?.trim() ?? '';
  const existingId = await findContactIdByEmail(config, email);

  const profile = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    companyName: input.company.trim(),
    state: input.region.trim(),
    source: GHL_GLAMPING_SHOW_QUIZ_TAG,
    ...(phone ? { phone } : {}),
    customFields,
  };

  if (!existingId) {
    const created = await ghlFetch<GhlContactIdPayload>(config, '/contacts/', {
      method: 'POST',
      body: JSON.stringify({
        locationId: config.locationId,
        email,
        tags,
        ...profile,
      }),
    });
    const contactId = contactIdFromPayload(created);
    if (!contactId) {
      throw new Error(`GHL create contact returned no id for ${email}`);
    }
    await addTagsToContact(config, contactId, tags);
    return { status: 'created', contactId };
  }

  await ghlFetch(config, `/contacts/${encodeURIComponent(existingId)}`, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
  await removeTagsFromContact(config, existingId, ghlQuizTagsToRemove(tags));
  await addTagsToContact(config, existingId, tags);
  return { status: 'updated', contactId: existingId };
}
