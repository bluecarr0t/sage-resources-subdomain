import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContactInsertRow } from '@/lib/contact-research/types';
import { assertWebResearchCategory } from '@/lib/contact-research/validate';
import { normalizeEmail } from '@/lib/contact-research/junk-email';

/**
 * Load existing contact emails (lowercased) for dedupe across all sources.
 */
export async function loadExistingContactEmails(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const emails = new Set<string>();
  let offset = 0;
  const pageSize = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from('contacts')
      .select('email')
      .not('email', 'is', null)
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Failed to load contacts emails: ${error.message}`);
    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const email = (row as { email: string | null }).email;
      if (email) emails.add(normalizeEmail(email));
    }

    offset += pageSize;
    if (rows.length < pageSize) break;
  }

  return emails;
}

export type InsertContactResult =
  | { status: 'inserted' }
  | { status: 'skipped'; reason: 'duplicate_email' | 'missing_category' | 'missing_email' }
  | { status: 'error'; message: string };

/**
 * Insert a web-research contact if email is new and category is present.
 */
export async function insertWebResearchContact(
  supabase: SupabaseClient,
  row: ContactInsertRow,
  existingEmails: Set<string>,
  options?: { dryRun?: boolean }
): Promise<InsertContactResult> {
  if (!row.email) return { status: 'skipped', reason: 'missing_email' };

  try {
    assertWebResearchCategory(row.category);
  } catch {
    return { status: 'skipped', reason: 'missing_category' };
  }

  const email = normalizeEmail(row.email);
  if (existingEmails.has(email)) {
    return { status: 'skipped', reason: 'duplicate_email' };
  }

  if (options?.dryRun) {
    existingEmails.add(email);
    return { status: 'inserted' };
  }

  const { error } = await supabase.from('contacts').upsert(row, {
    onConflict: 'source,external_id',
    ignoreDuplicates: false,
  });

  if (error) {
    if (error.message.toLowerCase().includes('contacts_email_lower_uidx')) {
      existingEmails.add(email);
      return { status: 'skipped', reason: 'duplicate_email' };
    }
    return { status: 'error', message: error.message };
  }

  existingEmails.add(email);
  return { status: 'inserted' };
}
