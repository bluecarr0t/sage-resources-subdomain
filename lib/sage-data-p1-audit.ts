/**
 * Shared helpers for P1 all_sage_data audit/apply scripts.
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';

config({ path: resolve(process.cwd(), '.env.local') });

export const OUTPUT_DIR = resolve(process.cwd(), 'scripts/output');
export const TODAY = new Date().toISOString().split('T')[0]!;

export function createP1AuditClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function parsePositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  const n = parseFloat(String(value).replace(/[$,]/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function writeCsv(path: string, header: string, lines: string[]): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(path, [header, ...lines].join('\n') + '\n');
}

export function normKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export async function fetchAllPropertyRows(
  supabase: SupabaseClient,
  select: string
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let offset = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from(ALL_SAGE_DATA_TABLE)
      .select(select)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

export function appendNote(
  existing: string | null | undefined,
  addition: string
): string {
  const base = (existing ?? '').trim();
  const marker = addition.slice(0, 48);
  if (base.includes(marker)) return base;
  return base ? `${base}\n\n${addition}` : addition;
}
