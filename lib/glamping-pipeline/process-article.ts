import type { OpenAI } from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import {
  filterNewProperties,
  normalizePropertyName,
} from '@/lib/glamping-discovery/deduplicate';
import {
  passesInclusionCriteria,
  passesPostEnrichmentUnitCriteria,
} from '@/lib/glamping-discovery/inclusion-filter';
import { enrichProperty } from '@/lib/glamping-discovery/enrich-and-insert';
import { extractPipelineFromArticle } from './extract-from-article';
import { PIPELINE_INSERT_TABLE, toPipelineInsertRow } from './to-insert-row';
import {
  applyIsOpenChangeWithHistory,
  openInitialPipelineStatusHistory,
} from './status-history';
import { matchStatusUpdatesToProperties } from './match-status-updates';
import { PIPELINE_PROCESSED_URLS_TABLE } from './constants';
import type { PipelineSegment } from './constants';
import type { PipelineExtractedProperty, PipelinePropertyRef } from './types';
import {
  passesRvPipelineInclusionCriteria,
  passesRvPipelinePostEnrichmentCriteria,
} from './rv-inclusion-filter';

export type ProcessPipelineArticleParams = {
  content: string;
  articleUrl?: string;
  dryRun: boolean;
  openai: OpenAI;
  supabase: SupabaseClient;
  dbPropertyNames: Set<string>;
  trackedProperties: PipelinePropertyRef[];
  runId?: string;
  segment?: PipelineSegment;
  /** When false, skip marking the URL processed (multi-segment pass on same article). */
  markProcessed?: boolean;
};

export type ProcessPipelineArticleResult = {
  propertiesExtracted: number;
  propertiesNew: number;
  propertiesInserted: number;
  statusUpdatesDetected: number;
  statusUpdatesApplied: number;
};

async function markUrlProcessed(
  sb: SupabaseClient,
  url: string,
  propertiesExtracted: number,
  statusUpdatesExtracted: number
): Promise<void> {
  await sb.from(PIPELINE_PROCESSED_URLS_TABLE).upsert(
    {
      url,
      processed_at: new Date().toISOString(),
      properties_extracted: propertiesExtracted,
      status_updates_extracted: statusUpdatesExtracted,
    },
    { onConflict: 'url' }
  );
}

export async function processPipelineArticle(
  params: ProcessPipelineArticleParams
): Promise<ProcessPipelineArticleResult> {
  const {
    content,
    articleUrl,
    dryRun,
    openai,
    supabase,
    dbPropertyNames,
    trackedProperties,
    runId,
    segment = 'glamping',
    markProcessed = true,
  } = params;

  const { new_properties, status_updates } = await extractPipelineFromArticle(
    content,
    openai,
    segment
  );

  const newProps = filterNewProperties(
    new_properties,
    dbPropertyNames
  ) as PipelineExtractedProperty[];

  const passing = newProps.filter((p) => {
    const result =
      segment === 'rv'
        ? passesRvPipelineInclusionCriteria(p)
        : passesInclusionCriteria(p);
    return result.pass;
  });

  let propertiesInserted = 0;
  for (const prop of passing) {
    const enriched = await enrichProperty(prop, openai);
    const post =
      segment === 'rv'
        ? passesRvPipelinePostEnrichmentCriteria(enriched)
        : passesPostEnrichmentUnitCriteria(enriched);
    if (!post.pass) continue;

    const pipelineProp: PipelineExtractedProperty = {
      ...enriched,
      property_name: prop.property_name,
      is_open: prop.is_open,
      property_type: prop.property_type ?? enriched.property_type,
      number_of_units: enriched.number_of_units ?? prop.number_of_units,
    };
    const row = toPipelineInsertRow(pipelineProp, segment);

    if (dryRun) {
      dbPropertyNames.add(normalizePropertyName(row.property_name));
      propertiesInserted++;
      continue;
    }

    const { data: inserted, error } = await supabase
      .from(PIPELINE_INSERT_TABLE)
      .insert(row)
      .select('id, slug, is_open')
      .single();

    if (error) {
      console.warn(
        `[glamping-pipeline] Insert failed (${segment}) for ${row.property_name}:`,
        error.message
      );
      continue;
    }

    await openInitialPipelineStatusHistory(supabase, {
      propertyId: inserted.id,
      slug: inserted.slug,
      isOpen: row.is_open as 'Proposed Development' | 'Under Construction',
      changeSource: 'weekly_pipeline_sync',
      evidenceUrl: articleUrl ?? null,
      runId: runId ?? null,
    });

    trackedProperties.push({
      id: inserted.id,
      slug: inserted.slug,
      property_name: row.property_name,
      is_open: row.is_open,
    });

    dbPropertyNames.add(normalizePropertyName(row.property_name));
    propertiesInserted++;
  }

  const matched = matchStatusUpdatesToProperties(status_updates, trackedProperties);
  let statusUpdatesApplied = 0;

  for (const { update, property } of matched) {
    const result = await applyIsOpenChangeWithHistory(supabase, {
      propertyId: property.id,
      slug: property.slug,
      previousIsOpen: property.is_open,
      nextIsOpen: update.is_open,
      changeSource: 'weekly_pipeline_sync',
      evidenceUrl: articleUrl ?? null,
      notes: update.evidence ?? null,
      runId: runId ?? null,
      dryRun,
    });

    if (result.changed) {
      statusUpdatesApplied++;
      property.is_open = update.is_open;
    }
  }

  if (!dryRun && articleUrl && markProcessed) {
    await markUrlProcessed(
      supabase,
      articleUrl,
      new_properties.length,
      status_updates.length
    );
  }

  return {
    propertiesExtracted: new_properties.length,
    propertiesNew: newProps.length,
    propertiesInserted,
    statusUpdatesDetected: matched.length,
    statusUpdatesApplied,
  };
}
