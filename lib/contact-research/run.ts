import type { SupabaseClient } from '@supabase/supabase-js';
import type OpenAI from 'openai';
import { buildContactSeedQueue } from '@/lib/contact-research/seed';
import { extractContactsFromMarkdown } from '@/lib/contact-research/extract';
import { insertWebResearchContact, loadExistingContactEmails } from '@/lib/contact-research/insert';
import { resolveAndScrapePages } from '@/lib/contact-research/resolve-pages';
import { toContactInsertRow } from '@/lib/contact-research/validate';
import type { SeedMode } from '@/lib/contact-research/types';

export type ContactResearchRunOptions = {
  supabase: SupabaseClient;
  openai: OpenAI;
  tavilyApiKey: string | null;
  mode?: SeedMode;
  limit?: number;
  inventoryOffset?: number;
  dryRun?: boolean;
  /** Optional sink for structured progress (CLI logging / cron metrics). */
  onProgress?: (message: string) => void;
};

export type ContactResearchRunResult = {
  queueSize: number;
  inserted: number;
  skipped: number;
  failed: number;
  insertedEmails: string[];
};

/**
 * Shared contact research orchestrator used by CLI and weekly cron.
 */
export async function runContactResearch(
  options: ContactResearchRunOptions
): Promise<ContactResearchRunResult> {
  const {
    supabase,
    openai,
    tavilyApiKey,
    mode = 'all',
    limit = 15,
    inventoryOffset = 0,
    dryRun = false,
    onProgress,
  } = options;

  const log = (message: string) => {
    onProgress?.(message);
  };

  const queue = await buildContactSeedQueue({
    supabase,
    tavilyApiKey,
    mode,
    limit,
    inventoryOffset,
  });
  log(`Seed queue: ${queue.length} candidates`);

  const existingEmails = await loadExistingContactEmails(supabase);
  log(`Existing contact emails: ${existingEmails.size}`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;
  const insertedEmails: string[] = [];

  for (let i = 0; i < queue.length; i++) {
    const candidate = queue[i]!;
    log(
      `[${i + 1}/${queue.length}] ${candidate.company_name} (${candidate.seed_source} → ${candidate.suggested_category})`
    );

    try {
      const pages = await resolveAndScrapePages({
        candidate,
        tavilyApiKey,
        maxPages: 2,
      });

      if (pages.length === 0) {
        skipped += 1;
        log('  no scrapable pages');
        continue;
      }

      for (const page of pages) {
        const extraction = await extractContactsFromMarkdown(
          openai,
          candidate,
          page.markdown,
          page.url
        );

        if (!extraction) continue;

        const row = toContactInsertRow(
          extraction,
          page.url,
          [
            `seed=${candidate.seed_source}`,
            `suggested=${candidate.suggested_category}`,
            `confidence=${extraction.confidence}`,
            candidate.notes ?? '',
            extraction.evidence_snippet ?? '',
          ]
            .filter(Boolean)
            .join(' | ')
        );

        const result = await insertWebResearchContact(supabase, row, existingEmails, {
          dryRun,
        });

        if (result.status === 'inserted') {
          inserted += 1;
          insertedEmails.push(row.email);
          log(`  ${dryRun ? 'would insert' : 'inserted'}: ${row.email} [${row.category}]`);
          break;
        }

        if (result.status === 'skipped') {
          skipped += 1;
          log(`  skipped: ${result.reason} (${extraction.email})`);
          if (result.reason === 'duplicate_email') break;
        } else {
          failed += 1;
          log(`  error: ${result.message}`);
        }
      }
    } catch (err) {
      failed += 1;
      log(`  failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { queueSize: queue.length, inserted, skipped, failed, insertedEmails };
}
