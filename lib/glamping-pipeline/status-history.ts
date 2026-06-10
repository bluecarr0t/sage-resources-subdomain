import type { SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import type { GlampingIsOpenValue } from '@/lib/glamping-is-open';
import {
  PIPELINE_STATUS_HISTORY_TABLE,
  type PipelineStatusChangeSource,
} from './constants';
import { todayUtcDateString } from './normalize-is-open';

export type ApplyIsOpenChangeParams = {
  propertyId: number;
  slug: string;
  previousIsOpen: string | null | undefined;
  nextIsOpen: GlampingIsOpenValue;
  asOfDate?: string;
  changeSource: PipelineStatusChangeSource;
  evidenceUrl?: string | null;
  notes?: string | null;
  runId?: string | null;
  dryRun?: boolean;
};

export type ApplyIsOpenChangeResult = {
  changed: boolean;
  previousIsOpen: string | null;
  nextIsOpen: GlampingIsOpenValue;
};

function normalizeStoredIsOpen(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/**
 * Close the open history stint (if any) and open a new one; update `all_sage_data.is_open`.
 */
export async function applyIsOpenChangeWithHistory(
  supabase: SupabaseClient,
  params: ApplyIsOpenChangeParams
): Promise<ApplyIsOpenChangeResult> {
  const previous = normalizeStoredIsOpen(params.previousIsOpen);
  const next = params.nextIsOpen;
  const asOfDate = params.asOfDate ?? todayUtcDateString();

  if (previous === next) {
    return { changed: false, previousIsOpen: previous || null, nextIsOpen: next };
  }

  if (params.dryRun) {
    return { changed: true, previousIsOpen: previous || null, nextIsOpen: next };
  }

  const { error: closeError } = await supabase
    .from(PIPELINE_STATUS_HISTORY_TABLE)
    .update({ ended_on: asOfDate })
    .eq('property_id', params.propertyId)
    .is('ended_on', null);

  if (closeError) {
    throw new Error(`Failed to close status history: ${closeError.message}`);
  }

  const { error: insertError } = await supabase
    .from(PIPELINE_STATUS_HISTORY_TABLE)
    .insert({
      property_id: params.propertyId,
      slug: params.slug,
      is_open: next,
      started_on: asOfDate,
      change_source: params.changeSource,
      evidence_url: params.evidenceUrl ?? null,
      notes: params.notes ?? null,
      run_id: params.runId ?? null,
    });

  if (insertError) {
    throw new Error(`Failed to open status history: ${insertError.message}`);
  }

  const { error: updateError } = await supabase
    .from(ALL_SAGE_DATA_TABLE)
    .update({ is_open: next, date_updated: asOfDate })
    .eq('id', params.propertyId);

  if (updateError) {
    throw new Error(`Failed to update property is_open: ${updateError.message}`);
  }

  return { changed: true, previousIsOpen: previous || null, nextIsOpen: next };
}

/** Record the first stint when a new pipeline property is inserted. */
export async function openInitialPipelineStatusHistory(
  supabase: SupabaseClient,
  params: {
    propertyId: number;
    slug: string;
    isOpen: GlampingIsOpenValue;
    startedOn?: string;
    changeSource: PipelineStatusChangeSource;
    evidenceUrl?: string | null;
    runId?: string | null;
    dryRun?: boolean;
  }
): Promise<void> {
  if (params.dryRun) return;

  const startedOn = params.startedOn ?? todayUtcDateString();
  const { error } = await supabase.from(PIPELINE_STATUS_HISTORY_TABLE).insert({
    property_id: params.propertyId,
    slug: params.slug,
    is_open: params.isOpen,
    started_on: startedOn,
    change_source: params.changeSource,
    evidence_url: params.evidenceUrl ?? null,
    run_id: params.runId ?? null,
  });

  if (error) {
    throw new Error(`Failed to seed pipeline status history: ${error.message}`);
  }
}

export type StatusStintDuration = {
  propertyId: number;
  slug: string;
  isOpen: string;
  startedOn: string;
  endedOn: string | null;
  daysInStage: number;
};

/** Days in the current or completed stint (inclusive of start day when still open). */
export function computeStintDays(
  startedOn: string,
  endedOn: string | null,
  asOfDate: string = todayUtcDateString()
): number {
  const start = Date.parse(`${startedOn}T00:00:00Z`);
  const end = Date.parse(`${endedOn ?? asOfDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}
