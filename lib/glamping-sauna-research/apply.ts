import type {
  ApplyResult,
  RowUpdatePayload,
  SaunaCohortRow,
  SaunaConflict,
  SaunaPropertyExtraction,
  YesNo,
} from '@/lib/glamping-sauna-research/types';
import { isSaunaFieldEmpty } from '@/lib/glamping-sauna-research/cohort';
import {
  deriveHotTubOrSaunaFromSauna,
  discoverySourceTag,
  findBestRowMatch,
  normalizeStoredYesNo,
  todayIsoDate,
} from '@/lib/glamping-sauna-research/normalize';

function canAutoApplyConfidence(
  confidence: 'high' | 'medium' | 'low',
  evidence: string
): boolean {
  if (confidence === 'high') return true;
  if (confidence === 'medium' && evidence.trim().length >= 12) return true;
  return false;
}

function appendNote(existing: string | null, line: string): string {
  const base = String(existing ?? '').trim();
  if (!base) return line;
  if (base.includes(line.slice(0, 40))) return base;
  return `${base}\n\n${line}`;
}

function mergeDiscoverySource(existing: string | null, tag: string): string {
  const e = String(existing ?? '').trim();
  if (!e) return tag;
  if (e.includes(tag)) return e;
  return `${e}; ${tag}`;
}

function checkConflict(
  conflicts: SaunaConflict[],
  row: SaunaCohortRow,
  field: string,
  existing: string | null,
  proposed: YesNo | null,
  confidence: 'high' | 'medium' | 'low',
  evidence: string,
  sourceUrl: string | null
): boolean {
  if (proposed == null) return false;
  const stored = normalizeStoredYesNo(existing);
  if (stored == null || isSaunaFieldEmpty(existing)) return false;
  if (stored === proposed) return false;

  conflicts.push({
    kind: 'value_mismatch',
    property_id: row.property_id,
    property_name: row.property_name,
    row_id: row.id,
    field,
    existing_value: existing,
    proposed_value: proposed,
    confidence,
    evidence,
    source_url: sourceUrl,
  });
  return true;
}

type SaunaDbField = 'unit_sauna' | 'property_sauna' | 'unit_hot_tub_or_sauna';

function setFieldIfAllowed(
  updates: Record<string, string>,
  conflicts: SaunaConflict[],
  row: SaunaCohortRow,
  field: SaunaDbField,
  proposed: YesNo | null,
  confidence: 'high' | 'medium' | 'low',
  evidence: string,
  sourceUrl: string | null
): void {
  if (proposed == null) return;
  const existing = row[field] as string | null;
  if (checkConflict(conflicts, row, field, existing, proposed, confidence, evidence, sourceUrl)) {
    return;
  }
  if (!isSaunaFieldEmpty(existing)) return;
  if (!canAutoApplyConfidence(confidence, evidence)) {
    conflicts.push({
      kind: 'low_confidence',
      property_id: row.property_id,
      property_name: row.property_name,
      row_id: row.id,
      field,
      existing_value: existing,
      proposed_value: proposed,
      confidence,
      evidence,
      source_url: sourceUrl,
    });
    return;
  }
  updates[field] = proposed;
}

/**
 * Map extraction to per-row DB updates; auto-apply null fills only.
 */
export function buildApplyResult(
  rows: SaunaCohortRow[],
  extraction: SaunaPropertyExtraction,
  scrapeUrl: string | null,
  runDate = todayIsoDate()
): ApplyResult {
  const conflicts: SaunaConflict[] = [];
  const applied: RowUpdatePayload[] = [];
  const unmatched_row_ids: number[] = [];
  const usedIds = new Set<number>();
  const tag = discoverySourceTag(runDate);
  const noteLine = `Sauna research (${runDate}): see discovery_source ${tag}${scrapeUrl ? ` — ${scrapeUrl}` : ''}.`;

  const propertyConf = extraction.confidence;
  const propertyEvidence =
    extraction.property_sauna_notes || extraction.sources.join(', ') || 'property-level';

  for (const unitExt of extraction.units) {
    const row = findBestRowMatch(rows, unitExt.match, usedIds);
    if (!row) {
      conflicts.push({
        kind: 'unmatched_row',
        property_id: rows[0]?.property_id ?? '',
        property_name: rows[0]?.property_name ?? null,
        row_id: null,
        field: 'unit_match',
        existing_value: null,
        proposed_value: JSON.stringify(unitExt.match),
        confidence: unitExt.confidence,
        evidence: unitExt.evidence,
        source_url: scrapeUrl,
      });
      continue;
    }
    usedIds.add(row.id);

    const updates: Record<string, string> = {};
    const unitOrSauna = deriveHotTubOrSaunaFromSauna(unitExt.unit_sauna);

    setFieldIfAllowed(
      updates,
      conflicts,
      row,
      'unit_sauna',
      unitExt.unit_sauna,
      unitExt.confidence,
      unitExt.evidence,
      scrapeUrl
    );
    setFieldIfAllowed(
      updates,
      conflicts,
      row,
      'unit_hot_tub_or_sauna',
      unitOrSauna,
      unitExt.confidence,
      unitExt.evidence,
      scrapeUrl
    );

    if (extraction.property_sauna != null && canAutoApplyConfidence(propertyConf, propertyEvidence)) {
      setFieldIfAllowed(
        updates,
        conflicts,
        row,
        'property_sauna',
        extraction.property_sauna,
        propertyConf,
        propertyEvidence,
        scrapeUrl
      );
    }

    if (Object.keys(updates).length > 0) {
      applied.push({
        id: row.id,
        property_id: row.property_id,
        updates: {
          ...updates,
          date_updated: runDate,
          discovery_source: mergeDiscoverySource(row.discovery_source, tag),
          notes: appendNote(row.notes, noteLine),
        },
      });
    }
  }

  for (const row of rows) {
    if (usedIds.has(row.id)) continue;
    unmatched_row_ids.push(row.id);

    if (extraction.property_sauna != null) {
      const updates: Record<string, string> = {};
      setFieldIfAllowed(
        updates,
        conflicts,
        row,
        'property_sauna',
        extraction.property_sauna,
        propertyConf,
        propertyEvidence,
        scrapeUrl
      );
      if (Object.keys(updates).length > 0) {
        applied.push({
          id: row.id,
          property_id: row.property_id,
          updates: {
            ...updates,
            date_updated: runDate,
            discovery_source: mergeDiscoverySource(row.discovery_source, tag),
            notes: appendNote(row.notes, noteLine),
          },
        });
      }
    }
  }

  const byId = new Map<number, RowUpdatePayload>();
  for (const p of applied) {
    const prev = byId.get(p.id);
    if (prev) {
      byId.set(p.id, {
        ...prev,
        updates: { ...prev.updates, ...p.updates },
      });
    } else {
      byId.set(p.id, p);
    }
  }

  return {
    applied: [...byId.values()],
    conflicts,
    unmatched_row_ids,
    scrape_url: scrapeUrl,
  };
}

export function applyResultToSqlUpdates(
  applied: RowUpdatePayload[],
  table = 'all_glamping_properties'
): string {
  const lines: string[] = [
    '-- Auto-generated sauna backfill (review before apply)',
    `-- Rows: ${applied.length}`,
    '',
  ];

  for (const row of applied) {
    const sets = Object.entries(row.updates)
      .map(([k, v]) => {
        if (k === 'notes') {
          return `  ${k} = COALESCE(${k}, '') || E'\\n\\n${String(v).replace(/'/g, "''")}'`;
        }
        return `  ${k} = '${String(v).replace(/'/g, "''")}'`;
      })
      .join(',\n');
    lines.push(`UPDATE public.${table} SET\n${sets}\nWHERE id = ${row.id};`, '');
  }

  return lines.join('\n');
}
