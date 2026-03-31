import type { CompsV2Candidate } from '@/lib/comps-v2/types';

export type UnitExperienceBucket = 'glamping' | 'rv' | 'tent' | 'campground' | 'vacation' | 'unknown';

const GLAMPING_SOURCES = new Set(['all_glamping_properties', 'hipcamp']);

/** Strong RV / trailer park positioning in the listing name (exclude from glamping discovery). */
export function isRvHeavyPropertyName(propertyName: string): boolean {
  const n = propertyName.toLowerCase();
  if (/\b(rv|motorhome)\s+(park|resort|village|campground|camp)\b/.test(n)) return true;
  if (/\b(trailer|rv)\s*(park|resort)\b/.test(n)) return true;
  if (/\brv\s*only\b/.test(n)) return true;
  if (/\btractor\s*trailer\b/.test(n)) return false;
  return false;
}

function blob(c: CompsV2Candidate): string {
  return [c.unit_type, c.description, c.property_name].filter(Boolean).join(' ').toLowerCase();
}

/**
 * Classify a single market row (unit offering) for glamping vs RV / tent / etc.
 * Used for row-level filtering and property-level site-weighted majority.
 */
export function classifyUnitExperienceBucket(c: CompsV2Candidate): UnitExperienceBucket {
  const t = blob(c);

  if (/\b(vrbo|airbnb|whole\s+(home|house|place|property)|entire\s+(home|place|cabin)|vacation\s+rental|short[\s-]term\s+rental|condo\s+rental)\b/.test(t)) {
    return 'vacation';
  }
  if (
    /\b(rv\s*site|rv\s*parking|motorhome|travel\s*trailer|fifth\s*wheel|5th\s*wheel|camper\s*van|campervan|pull[-\s]?through|full\s*hook|50\s*amp|30\s*amp|sewer\s*hook|black\s*water|tow\s*vehicle|class\s*[abc]\s*rv)\b/.test(
      t
    )
  ) {
    return 'rv';
  }
  if (
    /\b(tent\s*site|primitive\s*site|hike[-\s]?in|walk[-\s]?in\s*tent|car\s*camping|ground\s*tent|basic\s*tent)\b/.test(
      t
    )
  ) {
    return 'tent';
  }
  if (
    /\b(standard\s*site|partial\s*hook|picnic\s*table\s*only|tent\s*\/\s*rv)\b/.test(t) &&
    !/\b(yurt|glamp|safari|canvas|dome|tree\s*house|tiny)\b/.test(t)
  ) {
    return 'campground';
  }
  if (
    /\b(glamp|yurt|safari\s*tent|bell\s*tent|canvas\s*tent|geodesic|dome\s*(suite|unit|tent)?|tree\s*house|treehouse|tiny\s*(home|house|cabin)|shepherd'?s?\s*hut|wall\s*tent|tipi|teepee|eco[\s-]?(pod|tent)|lodg(?:e|ing)\s*pod|mirror\s*cabin|airstream\s*(suite|glamp|stay))\b/.test(
      t
    )
  ) {
    return 'glamping';
  }
  if (/\b(cabin|cottage|bungalow|chalet|hut\s*rental)\b/.test(t) && !/\b(rv|tent\s*site)\b/.test(t)) {
    return 'glamping';
  }

  return 'unknown';
}

/** Row is usable for glamping-focused market pulls (Sage / Hipcamp line items). */
export function rowPassesGlampingUnitGate(c: CompsV2Candidate): boolean {
  if (!GLAMPING_SOURCES.has(c.source_table)) return true;

  const ut = c.unit_type ?? '';
  if (/\b(mixed\s*glamp|multiple\s*unit|glamping\s*[—-]\s*multiple)\b/i.test(ut)) return true;

  if (isRvHeavyPropertyName(c.property_name)) return false;

  const b = classifyUnitExperienceBucket(c);
  if (b === 'rv' || b === 'tent' || b === 'campground' || b === 'vacation') return false;

  if (b === 'unknown') {
    if (c.source_table === 'all_glamping_properties') return true;
    if (c.source_table === 'hipcamp') {
      return (
        /\b(glamp|yurt|cabin|safari|canvas|dome|tree\s*house|treehouse|tiny|pod|retreat|eco|resort|lodge|ranch|outdoor|hideaway)\b/i.test(
          blob(c)
        ) && !isRvHeavyPropertyName(c.property_name)
      );
    }
    return false;
  }

  return b === 'glamping';
}

export function siteWeightForMajority(c: CompsV2Candidate): number {
  const q = c.quantity_of_units;
  if (q != null && q > 0) return Math.min(10_000, q);
  return 1;
}
