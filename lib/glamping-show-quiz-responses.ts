/**
 * Persist Glamping Show booth quiz completions in Supabase.
 * Service-role writes only; RLS lets managed users read.
 */

import { createServerClient } from '@/lib/supabase';
import type { QuizAnswers, QuizOutcome } from '@/lib/glamping-show-quiz';

export const GLAMPING_SHOW_QUIZ_RESPONSES_TABLE = 'glamping_show_quiz_responses';

export type QuizGhlSyncStatus =
  | 'pending'
  | 'created'
  | 'updated'
  | 'skipped'
  | 'failed';

export type GlampingShowQuizResponseInsert = {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  region: string;
  phone: string;
  answers: QuizAnswers;
  outcome: QuizOutcome;
  newsletterOptIn: boolean;
};

export async function insertGlampingShowQuizResponse(
  input: GlampingShowQuizResponseInsert
): Promise<{ id: string } | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(GLAMPING_SHOW_QUIZ_RESPONSES_TABLE)
    .insert({
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      company: input.company,
      region: input.region,
      phone: input.phone || null,
      role: input.answers.role,
      stage: input.answers.stage,
      need: input.answers.need,
      timeline: input.answers.timeline,
      outcome: input.outcome,
      newsletter_opt_in: input.newsletterOptIn,
      ghl_sync_status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    console.error(
      '[glamping-show-quiz] response insert failed:',
      error?.message ?? 'missing id'
    );
    return null;
  }

  return { id: data.id as string };
}

export async function markGlampingShowQuizGhlSync(
  id: string,
  status: QuizGhlSyncStatus,
  options?: { contactId?: string | null; error?: string | null }
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from(GLAMPING_SHOW_QUIZ_RESPONSES_TABLE)
    .update({
      ghl_sync_status: status,
      ghl_contact_id: options?.contactId ?? null,
      ghl_sync_error: options?.error ?? null,
      ghl_synced_at: status === 'pending' ? null : new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error(
      '[glamping-show-quiz] failed to store GHL sync status:',
      error.message
    );
  }
}
