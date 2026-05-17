import {
  type LandOperatorCategory,
  isValidLandOperatorCategory,
} from '@/lib/glamping-land-operator-category';

const MAX_PROPERTY_TYPE_LEN = 160;

export interface GlampingTextClassification {
  property_type: string | null;
  land_operator_category: LandOperatorCategory | null;
}

/**
 * Normalizes and validates OpenAI JSON for `property_type` + `land_operator_category`.
 * Invalid enum values become null; overly long property_type is truncated.
 */
export function parseGlampingClassificationJson(
  raw: string
): GlampingTextClassification {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) {
      return { property_type: null, land_operator_category: null };
    }
    try {
      parsed = JSON.parse(m[0]);
    } catch {
      return { property_type: null, land_operator_category: null };
    }
  }

  let propertyType: string | null = null;
  const pt = parsed.property_type;
  if (typeof pt === 'string') {
    const t = pt.trim();
    if (t.length > 0) {
      propertyType =
        t.length > MAX_PROPERTY_TYPE_LEN ? t.slice(0, MAX_PROPERTY_TYPE_LEN) : t;
    }
  }

  let landOp: LandOperatorCategory | null = null;
  const loc = parsed.land_operator_category;
  if (typeof loc === 'string' && isValidLandOperatorCategory(loc.trim())) {
    landOp = loc.trim() as LandOperatorCategory;
  }

  return { property_type: propertyType, land_operator_category: landOp };
}

export function buildGlampingClassificationPrompt(
  propertyName: string,
  description: string | null
): string {
  const name = propertyName.trim() || 'Unknown';
  const desc = (description ?? '').trim() || '(no description provided)';

  return `You classify glamping / outdoor-hospitality listings for a database.

Property name:
${name}

Description:
${desc}

Infer two fields:

1) property_type — Short human-readable label for the *product* (not land tenure). Examples: "Glamping Resort", "Luxury Campground", "Marina with Glamping", "Outdoor Resort", "Landscape Hotel", "Boutique Camping", "Farm Stay", "Vineyard Glamping", "RV Resort with Glamping". Pick the best single phrase (Title Case), 2–5 words when possible.

2) land_operator_category — Exactly one of these snake_case tokens:
- private_commercial — Privately owned or commercially operated on private / resort / farm / vineyard / tribal casino / hotel grounds (default when it is not clearly a government park).
- state_park — Operated primarily as a U.S. state or Canadian provincial park / recreation area.
- federal_public — U.S. federal public land or agency (NPS, USFS, BLM, Army Corps, national wildlife refuge, similar) or Canadian federal parks where the glamping is inside that jurisdiction.
- other_public — County, city, municipal, regional district, or other local-government park / recreation authority (not state/provincial-wide and not federal).

If you are unsure for land_operator_category, prefer private_commercial unless the name or description clearly indicates public-agency operation.

Return ONLY valid JSON, no markdown, in this exact shape:
{"property_type":"<string>","land_operator_category":"<one of the four tokens>"}`;
}
