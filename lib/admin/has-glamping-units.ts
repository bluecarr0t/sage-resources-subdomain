/**
 * Derived “has glamping units” from sibling `unit_type` + `quantity_of_units`.
 * Not a stored column — RV Park / RV Resort stay `is_glamping_property = No`.
 */

import {
  classifyInventoryUnitType,
  parsePositiveQuantity,
} from '@/lib/admin/glamping-professionalization-score';
import { GLAMPING_UNIT_CLASSIFICATION_FAMILIES } from '@/lib/glamping-unit-type-classification';
import { listUnitTypeNormalizePhrases } from '@/lib/glamping-unit-type-normalize';

export type HasGlampingUnitsFilter = 'yes' | 'no';

export type GlampingUnitsSummary = {
  hasGlampingUnits: boolean;
  /** Sum of `quantity_of_units` on glamping inventory rows (0 when qty is missing). */
  glampingUnitCount: number;
};

export function isGlampingInventoryUnitType(
  unitType: string | null | undefined
): boolean {
  return classifyInventoryUnitType(unitType).class === 'glamping';
}

export function summarizeGlampingUnits(
  rows: Array<{
    unit_type?: string | null;
    quantity_of_units?: string | number | null;
  }>
): GlampingUnitsSummary {
  let glampingUnitCount = 0;
  let hasGlampingUnits = false;
  for (const row of rows) {
    if (!isGlampingInventoryUnitType(row.unit_type)) continue;
    hasGlampingUnits = true;
    glampingUnitCount += parsePositiveQuantity(row.quantity_of_units) ?? 0;
  }
  return { hasGlampingUnits, glampingUnitCount };
}

export function normalizeUnitTypeMatchKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Canonical labels + aliases + normalize phrases that classify as glamping.
 * Used by the list-anchors SQL function so the filter matches the modal.
 */
export function listGlampingInventoryUnitTypeLabels(): string[] {
  const labels = new Set<string>();
  const add = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (isGlampingInventoryUnitType(trimmed)) {
      labels.add(trimmed);
    }
  };

  for (const family of GLAMPING_UNIT_CLASSIFICATION_FAMILIES) {
    for (const subtype of family.subtypes) {
      add(subtype.canonical);
      for (const alias of subtype.aliases ?? []) {
        add(alias);
      }
    }
  }
  for (const phrase of listUnitTypeNormalizePhrases()) {
    add(phrase);
  }

  return [...labels].sort((a, b) => a.localeCompare(b, 'en'));
}

export function listGlampingInventoryUnitTypeNorms(): string[] {
  return [
    ...new Set(listGlampingInventoryUnitTypeLabels().map(normalizeUnitTypeMatchKey)),
  ].sort((a, b) => a.localeCompare(b, 'en'));
}

function escapeSqlStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/** SQL body for `is_glamping_inventory_unit_type(text)` — keep in sync via apply script. */
export function buildIsGlampingInventoryUnitTypeSql(): string {
  const arraySql = listGlampingInventoryUnitTypeNorms()
    .map((label) => `      '${escapeSqlStringLiteral(label)}'`)
    .join(',\n');

  return `CREATE OR REPLACE FUNCTION public.is_glamping_inventory_unit_type(p_unit_type text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    p_unit_type IS NOT NULL
    AND btrim(p_unit_type) <> ''
    AND lower(btrim(regexp_replace(p_unit_type, '\\s+', ' ', 'g'))) = ANY (
      ARRAY[
${arraySql}
      ]::text[]
    );
$$;`;
}
