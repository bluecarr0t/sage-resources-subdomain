/**
 * Backfill existing sage_ai_sessions.messages JSONB arrays into the new
 * sage_ai_messages child table. Idempotent - skips sessions that already
 * have rows in the child table.
 *
 * Usage:
 *   tsx scripts/migrate-sage-ai-sessions-to-messages.ts [--dry-run]
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
 */

import { createClient } from '@supabase/supabase-js';

interface LegacySession {
  id: string;
  user_id: string;
  messages: unknown;
}

interface UiMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  parts?: unknown[];
  content?: string;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes('--dry-run');

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  let offset = 0;
  const pageSize = 100;
  let totalSessions = 0;
  let totalMessages = 0;

  while (true) {
    const { data: sessions, error } = await supabase
      .from('sage_ai_sessions')
      .select('id, user_id, messages')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Failed to fetch sessions:', error);
      process.exit(1);
    }
    if (!sessions || sessions.length === 0) break;

    for (const session of sessions as LegacySession[]) {
      const { count, error: countErr } = await supabase
        .from('sage_ai_messages')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session.id);
      if (countErr) {
        console.error(`Count error for session ${session.id}:`, countErr);
        continue;
      }
      if ((count ?? 0) > 0) continue;

      const rawMessages = Array.isArray(session.messages)
        ? (session.messages as UiMessage[])
        : [];
      if (rawMessages.length === 0) continue;

      const rows = rawMessages.map((m, idx) => ({
        session_id: session.id,
        user_id: session.user_id,
        ordinal: idx,
        role: m.role ?? 'user',
        parts: m.parts ?? (m.content ? [{ type: 'text', text: m.content }] : []),
      }));

      if (dryRun) {
        console.log(`[dry-run] would insert ${rows.length} rows for session ${session.id}`);
      } else {
        const { error: insertErr } = await supabase
          .from('sage_ai_messages')
          .insert(rows);
        if (insertErr) {
          console.error(`Insert error for session ${session.id}:`, insertErr);
          continue;
        }
      }

      totalSessions++;
      totalMessages += rows.length;
    }

    if (sessions.length < pageSize) break;
    offset += pageSize;
  }

  console.log(
    `${dryRun ? '[dry-run] ' : ''}Backfilled ${totalMessages} messages across ${totalSessions} sessions`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
