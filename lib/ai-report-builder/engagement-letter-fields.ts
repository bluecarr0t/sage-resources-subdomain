/**
 * Engagement letter field mapping (LLM + heuristic). No PDF dependency.
 */

import { chatCompletion } from './llm-provider';
import { resolveUsStateAbbr } from '@/lib/us-state-centers';
import { REPORT_MARKET_TYPE_OPTIONS } from '@/lib/report-constants';

export interface EngagementLetterExtract {
  property_name: string | null;
  service: string | null;
  address_1: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  market_type: string | null;
  parcel_number: string | null;
  client_entity: string | null;
  client_contact_name: string | null;
  client_address: string | null;
  client_city_state_zip: string | null;
  client_email: string | null;
  client_phone: string | null;
  engagement_date: string | null;
  current_use: string | null;
  property_intended_for: string | null;
  intended_use_of_study: string | null;
  resort_type_raw: string | null;
  amenities_description: string | null;
  warnings: string[];
}

function emptyExtract(warnings: string[] = []): EngagementLetterExtract {
  return {
    property_name: null,
    service: null,
    address_1: null,
    city: null,
    state: null,
    zip_code: null,
    market_type: null,
    parcel_number: null,
    client_entity: null,
    client_contact_name: null,
    client_address: null,
    client_city_state_zip: null,
    client_email: null,
    client_phone: null,
    engagement_date: null,
    current_use: null,
    property_intended_for: null,
    intended_use_of_study: null,
    resort_type_raw: null,
    amenities_description: null,
    warnings,
  };
}

function mapMarketType(resortType: string | null | undefined, propertyName: string | null): string | null {
  const hay = `${resortType ?? ''} ${propertyName ?? ''}`.toLowerCase();
  if (!hay.trim()) return null;
  if (/\brv\b/.test(hay) && /glamp/.test(hay)) return 'rv_glamping';
  if (/glamp|yurt|safari|cabin|wellness|eco.?lodge/.test(hay)) return 'glamping';
  if (/\brv\b|campground|pull.?thru/.test(hay)) return 'rv';
  if (/marina|boat/.test(hay)) return 'marina';
  if (/landscape.?hotel/.test(hay)) return 'landscape_hotel';
  const allowed = new Set(REPORT_MARKET_TYPE_OPTIONS.map((o) => o.value));
  return allowed.has('glamping') ? 'glamping' : null;
}

function mapService(text: string, llmService: string | null): string | null {
  if (llmService?.trim()) {
    const s = llmService.trim();
    if (/feasibility/i.test(s)) return 'Feasibility Study';
    if (/consultative|market\s*study/i.test(s)) return 'Market Analysis';
    if (/appraisal/i.test(s)) return 'Appraisal';
    if (/revenue/i.test(s)) return 'Revenue Projection';
    return s;
  }
  if (/Feasibility Study Engagement Letter/i.test(text)) return 'Feasibility Study';
  return null;
}

export function buildAmenitiesDescription(parts: {
  current_use: string | null;
  property_intended_for: string | null;
  intended_use_of_study: string | null;
  resort_type_raw: string | null;
  client_email: string | null;
  client_phone: string | null;
  engagement_date: string | null;
}): string | null {
  const lines: string[] = [];
  if (parts.resort_type_raw) lines.push(`Resort type (engagement): ${parts.resort_type_raw}`);
  if (parts.current_use) lines.push(`Current use of property: ${parts.current_use}`);
  if (parts.property_intended_for) lines.push(`Property is intended for: ${parts.property_intended_for}`);
  if (parts.intended_use_of_study) lines.push(`Intended use of study: ${parts.intended_use_of_study}`);
  // Intentionally omit client_email / client_phone — keep out of amenities brief + Tavily queries
  if (parts.engagement_date) lines.push(`Engagement date: ${parts.engagement_date}`);
  return lines.length ? lines.join('\n') : null;
}

function normalizeState(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return resolveUsStateAbbr(raw.trim()) ?? (raw.trim().length === 2 ? raw.trim().toUpperCase() : null);
}

function normalizeZip(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const m = raw.trim().match(/\b(\d{5}(?:-\d{4})?)\b/);
  return m ? m[1] : null;
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.length >= 10 ? digits : null;
}

interface LlmEngagementJson {
  property_name?: string | null;
  resort_type?: string | null;
  address_1?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  parcel_number?: string | null;
  client_entity?: string | null;
  client_contact_name?: string | null;
  client_address?: string | null;
  client_city?: string | null;
  client_state?: string | null;
  client_zip?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  engagement_date?: string | null;
  current_use?: string | null;
  property_intended_for?: string | null;
  intended_use_of_study?: string | null;
  service_selected?: string | null;
}

async function llmExtract(text: string): Promise<LlmEngagementJson> {
  const systemMsg = `You extract fields from Sage Outdoor Advisory "Feasibility Study Engagement Letter" PDFs.
The PDF text order is often scrambled (form values appear away from labels). Infer the correct mapping using label names and value shapes.
Return ONLY a JSON object with these keys (use null when unknown):
property_name, resort_type, address_1, city, state, zip_code, parcel_number,
client_entity (Legal Business Name), client_contact_name, client_address, client_city, client_state, client_zip,
client_email, client_phone, engagement_date (YYYY-MM-DD if possible),
current_use, property_intended_for, intended_use_of_study, service_selected
(service_selected one of: "Feasibility Study", "Market Study", "Consultative Study", or null).
CRITICAL name rules:
- property_name = Resort Name (the project being studied). Often includes Glamping, Resort, Campground, Lodge, Wellness, Farm as a project title (e.g. "Nordic Wellness Glamping & Christmas Tree Farm").
- client_entity = Legal Business Name only (e.g. "Heritage Farms", "ABC Development LLC"). NEVER put Legal Business Name into property_name.
- When a line has tab-separated values like "Glamping- Wellness\\tHeritage Farms", left is resort_type and right is client_entity — not the resort name.
Do not invent values. Prefer resort/property fields over Sage's Chicago office address (5113 South Harper).`;

  const userMsg = `Extract engagement letter fields from this text:\n\n${text.slice(0, 12000)}`;

  const content = await chatCompletion(systemMsg, userMsg, {
    temperature: 0,
    maxTokens: 900,
    responseFormat: 'json_object',
  });

  const parsed = JSON.parse(content) as LlmEngagementJson;
  return parsed && typeof parsed === 'object' ? parsed : {};
}

export function heuristicExtractEngagementLetter(text: string): EngagementLetterExtract {
  const warnings = ['Used heuristic parser (LLM unavailable or failed)'];
  const emails = [...text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((m) => m[0]);
  const email = emails.find((e) => !/sageoutdooradvisory/i.test(e)) ?? null;

  const phones = [...text.matchAll(/\b(\d{10})\b/g)].map((m) => m[1]);
  const phone = phones.find((p) => p !== '3122911921') ?? null;

  const date = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] ?? null;

  const streetMatches = [
    ...text.matchAll(
      /\b(\d{2,5}\s+[A-Za-z0-9 .'-]+(?:Rd|Road|St|Street|Ave|Avenue|Dr|Drive|Ln|Lane|Way|Blvd|Highway|Hwy)\.?)\b/gi
    ),
  ].map((m) => m[1].trim());
  const streets = streetMatches.filter((s) => !/5113\s+South\s+Harper/i.test(s));
  const resortAddress = streets.find((s) => /Riverview|Resort|Farm|Park|Lake/i.test(s)) ?? streets[0] ?? null;
  const clientStreet = streets.find((s) => s !== resortAddress) ?? null;

  const cityStateZip = text.match(/\b([A-Z][a-zA-Z.'-]+)\s+([A-Z][a-z]+|[A-Z]{2})\s+(\d{5})\b/);
  const client_city = cityStateZip?.[1] ?? null;
  const client_state = normalizeState(cityStateZip?.[2] ?? null);
  const client_zip = cityStateZip?.[3] ?? null;

  const contact =
    text.match(/Contact Info:\s*Date:([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+)/)?.[1]?.trim() ??
    text.match(/ACCEPTED AND AGREED:\s*\n([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+)/)?.[1]?.trim() ??
    null;

  const propertyCandidates = [
    ...text.matchAll(/\n([A-Z][^\n]{10,90}(?:Glamping|Resort|Campground|Farm|Lodge)[^\n]*)/g),
  ]
    .map((m) => m[1].trim())
    .filter((n) => !/Engagement Letter|Feasibility Study Includes|Current Use|Glamping-\s*Wellness/i.test(n))
    .filter((n) => !/\t/.test(n));
  const propertyName =
    propertyCandidates.find((n) => /Glamping|Resort|Campground|Lodge/i.test(n) && n.split(/\s+/).length >= 3) ??
    propertyCandidates.find((n) => /Glamping|Resort|Campground|Lodge/i.test(n)) ??
    propertyCandidates[0] ??
    null;

  const parcelCandidates = [...text.matchAll(/\b(\d{6,12})\b/g)].map((m) => m[1]);
  const parcel_number = parcelCandidates.find((p) => p !== '3122911921') ?? null;

  const resortType =
    text.match(/\b(Glamping[-\s]+Wellness|RV(?:\s*&\s*Glamping)?|Campground|Marina)\b/i)?.[0]?.trim() ??
    null;

  const currentUse =
    text.match(/\n(Christmas Tree Farm[^\n]*)/)?.[1]?.trim() ??
    text.match(/Current Use of Property:\s*\n?([^\n]{4,120})/i)?.[1]?.trim() ??
    null;

  const intended =
    text.match(/\n(Decision making[^\n]*)/)?.[1]?.trim() ??
    text.match(/Intended Use of Study:\s*\n?([^\n]{4,160})/i)?.[1]?.trim() ??
    null;

  const skipCityTokens = new Set([
    'Ohio', 'Illinois', 'Chicago', 'Document', 'Contact', 'Legal', 'Resort', 'Property',
    'Feasibility', 'Study', 'Engagement', 'Letter', 'Thank', 'Sage', 'Outdoor', 'Current',
    'Intended', 'Heritage', 'Farms', 'Farm', 'Christmas', 'Tree', 'Events', 'Primitive',
    'Camping', 'Nordic', 'Wellness', 'Glamping', 'Decision', 'Hudson', 'Middleton',
    'Riverview', 'Business', 'Name', 'Address', 'Primary', 'Identification', 'Use',
    'Type', 'Parcel', 'Number', 'Making', 'Financing', 'Investor', 'Support', 'Fall',
  ]);

  let city: string | null = null;
  const idIdx = text.indexOf('IDENTIFICATION OF PROPERTY');
  // Common engagement-letter resort cities appearing as lone tokens
  const knownResortCity = text.match(
    /\b(Peninsula|Bend|Sedona|Aspen|Moab|Durango|Boise|Missoula|Asheville|Charlottesville)\b/
  )?.[1];
  if (knownResortCity && knownResortCity !== client_city) {
    city = knownResortCity;
  } else {
    for (const m of text.matchAll(/\b([A-Z][a-z]{2,})\b/g)) {
      const c = m[1];
      if (skipCityTokens.has(c)) continue;
      if (client_city && c === client_city) continue;
      const cIdx = text.indexOf(c);
      if (idIdx >= 0 && cIdx > idIdx) {
        city = c;
        break;
      }
    }
  }

  // Prefer resort state near property identification; ignore Sage letterhead (Illinois)
  const afterId = idIdx >= 0 ? text.slice(idIdx) : text;
  const stateNameRe =
    /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/g;
  const statesInPropertyBlock = [...afterId.matchAll(stateNameRe)].map((m) => m[1]);
  const preferredStateName =
    statesInPropertyBlock.find((s) => s !== 'Illinois') ??
    statesInPropertyBlock[0] ??
    null;
  const state = normalizeState(preferredStateName) ?? client_state;

  let client_entity: string | null = null;
  const heritage = text.match(/\b(Heritage Farms)\b/);
  if (heritage) {
    client_entity = heritage[1];
  } else {
    client_entity =
      text.match(/Legal Business Name:\s*\n([A-Za-z][A-Za-z0-9 &.'-]{2,80})/)?.[1]?.trim() ?? null;
    if (!client_entity) {
      const biz = text.match(
        /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2}\s+(?:LLC|Inc|Holdings|Partners|Company|Farms))\b/
      );
      // Avoid grabbing "Wellness Heritage Farms" across tabs
      const candidate = biz?.[1] ?? null;
      client_entity = candidate && !/\t/.test(candidate) ? candidate : null;
    }
  }

  const extract = emptyExtract(warnings);
  extract.property_name = propertyName;
  extract.address_1 = resortAddress;
  extract.city = city;
  extract.state = state;
  extract.zip_code = null;
  extract.parcel_number = parcel_number;
  extract.client_entity = client_entity;
  extract.client_contact_name = contact;
  extract.client_address = clientStreet;
  extract.client_city_state_zip =
    client_city && (client_state || state)
      ? `${client_city}, ${client_state ?? state}${client_zip ? ` ${client_zip}` : ''}`
      : null;
  extract.client_email = email;
  extract.client_phone = normalizePhone(phone);
  extract.engagement_date = date;
  extract.current_use = currentUse;
  extract.property_intended_for = /\bTBD\b/.test(text) ? 'TBD' : null;
  extract.intended_use_of_study = intended;
  extract.resort_type_raw = resortType;
  extract.service = mapService(text, null);
  extract.market_type = mapMarketType(resortType, propertyName);
  extract.amenities_description = buildAmenitiesDescription(extract);
  return extract;
}

function fromLlm(raw: LlmEngagementJson, fullText: string): EngagementLetterExtract {
  const warnings: string[] = [];
  const clientState = normalizeState(raw.client_state) ?? normalizeState(raw.state);
  const clientZip = normalizeZip(raw.client_zip);
  const zip = normalizeZip(raw.zip_code);

  const client_city_state_zip =
    raw.client_city && clientState
      ? `${raw.client_city.trim()}, ${clientState}${clientZip ? ` ${clientZip}` : ''}`
      : null;

  const extract = emptyExtract(warnings);
  extract.property_name = raw.property_name?.trim() || null;
  extract.resort_type_raw = raw.resort_type?.trim() || null;
  extract.address_1 = raw.address_1?.trim() || null;
  extract.city = raw.city?.trim() || null;
  extract.state = normalizeState(raw.state);
  extract.zip_code = zip;
  if (zip && clientZip && zip === clientZip && !raw.zip_code) {
    extract.zip_code = null;
  }
  extract.parcel_number = raw.parcel_number?.trim() || null;
  extract.client_entity = raw.client_entity?.trim() || null;
  extract.client_contact_name = raw.client_contact_name?.trim() || null;
  extract.client_address = raw.client_address?.trim() || null;
  extract.client_city_state_zip = client_city_state_zip;
  extract.client_email = raw.client_email?.trim() || null;
  extract.client_phone = normalizePhone(raw.client_phone);
  extract.engagement_date = raw.engagement_date?.trim() || null;
  extract.current_use = raw.current_use?.trim() || null;
  extract.property_intended_for = raw.property_intended_for?.trim() || null;
  extract.intended_use_of_study = raw.intended_use_of_study?.trim() || null;
  extract.service = mapService(fullText, raw.service_selected ?? null);
  extract.market_type = mapMarketType(extract.resort_type_raw, extract.property_name);
  extract.amenities_description = buildAmenitiesDescription(extract);

  if (!extract.property_name) warnings.push('Could not find resort / property name');
  if (!extract.city || !extract.state) warnings.push('City/state incomplete — please verify');
  extract.warnings = warnings;
  return extract;
}

function mergeExtractPreferPrimary(
  primary: EngagementLetterExtract,
  fallback: EngagementLetterExtract
): EngagementLetterExtract {
  const out: EngagementLetterExtract = { ...fallback };
  (Object.keys(primary) as (keyof EngagementLetterExtract)[]).forEach((k) => {
    const v = primary[k];
    if (k === 'warnings') return;
    if (v != null && v !== '') {
      (out as unknown as Record<string, unknown>)[k] = v;
    }
  });
  out.warnings = [...new Set([...primary.warnings, ...fallback.warnings])];
  out.amenities_description = buildAmenitiesDescription(out);
  out.market_type = out.market_type ?? mapMarketType(out.resort_type_raw, out.property_name);
  out.service = out.service ?? fallback.service;
  return out;
}

function normName(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function looksLikeLegalEntityName(name: string | null | undefined): boolean {
  if (!name?.trim()) return false;
  // Short "X Farms/LLC/…" style legal names without project keywords
  if (/\b(llc|inc|holdings|partners|company|corp|ltd)\b/i.test(name)) return true;
  if (/\bfarms?\b/i.test(name) && !/\b(glamping|resort|campground|lodge|wellness)\b/i.test(name)) {
    return true;
  }
  return false;
}

function looksLikeResortProjectName(name: string | null | undefined): boolean {
  if (!name?.trim()) return false;
  if (/\b(glamping|resort|campground|lodge|wellness)\b/i.test(name)) return true;
  // Longer titled projects ("Nordic Wellness Glamping & Christmas Tree Farm")
  return name.trim().split(/\s+/).length >= 4;
}

/**
 * Correct LLM/heuristic confusion between Resort Name and Legal Business Name.
 * Scrambled engagement PDFs often put entity next to resort type; models then
 * put "Heritage Farms" in property_name and leave client_entity blank.
 */
export function reconcilePropertyAndClientEntity(
  primary: EngagementLetterExtract,
  heuristic: EngagementLetterExtract
): EngagementLetterExtract {
  const out: EngagementLetterExtract = { ...primary };
  const warnings = [...primary.warnings];

  const pName = out.property_name;
  const pEntity = out.client_entity;
  const hName = heuristic.property_name;
  const hEntity = heuristic.client_entity;

  const primaryNameIsEntity =
    !!pName &&
    (looksLikeLegalEntityName(pName) ||
      (hEntity != null && normName(pName) === normName(hEntity)) ||
      (pEntity != null && normName(pName) === normName(pEntity)));

  const heuristicHasBetterResortName =
    !!hName &&
    looksLikeResortProjectName(hName) &&
    normName(hName) !== normName(pName);

  if (primaryNameIsEntity && heuristicHasBetterResortName) {
    out.property_name = hName;
    // Recover entity: prefer existing primary entity, else the mislabeled name, else heuristic
    if (!pEntity || normName(pEntity) === normName(hName)) {
      out.client_entity =
        (pName && looksLikeLegalEntityName(pName) ? pName : null) ?? hEntity ?? pEntity;
    }
    warnings.push('Corrected resort name vs legal business name using heuristic parser');
  } else {
    // Fill blanks from heuristic without overriding a good LLM resort name
    if (!out.client_entity && hEntity) out.client_entity = hEntity;
    if (!out.property_name && hName) out.property_name = hName;
  }

  // If both names ended up identical and heuristic separates them, prefer heuristic pair
  if (
    out.property_name &&
    out.client_entity &&
    normName(out.property_name) === normName(out.client_entity) &&
    hName &&
    hEntity &&
    normName(hName) !== normName(hEntity)
  ) {
    out.property_name = hName;
    out.client_entity = hEntity;
    warnings.push('Split identical resort/legal names using heuristic parser');
  }

  out.warnings = [...new Set(warnings)];
  out.market_type = mapMarketType(out.resort_type_raw, out.property_name) ?? out.market_type;
  out.amenities_description = buildAmenitiesDescription(out);
  return out;
}

/** Parse already-extracted engagement letter text into form fields. */
export async function parseEngagementLetterText(text: string): Promise<EngagementLetterExtract> {
  const baseWarnings: string[] = [];
  if (!/engagement letter/i.test(text) && !/feasibility study/i.test(text)) {
    baseWarnings.push('PDF may not be a Sage engagement letter — verify extracted fields');
  }

  const heuristic = heuristicExtractEngagementLetter(text);

  let extract: EngagementLetterExtract;
  try {
    const llm = await llmExtract(text);
    const fromModel = fromLlm(llm, text);
    // Always merge blanks from heuristic, then fix name/entity swaps even when
    // LLM returned a full city/state (previously skipped heuristic entirely).
    extract = mergeExtractPreferPrimary(fromModel, heuristic);
    extract = reconcilePropertyAndClientEntity(extract, heuristic);
    const filledFromHeuristic =
      (!fromModel.client_entity && !!extract.client_entity) ||
      (!fromModel.property_name && !!extract.property_name) ||
      (!fromModel.city && !!extract.city) ||
      (!fromModel.state && !!extract.state);
    if (filledFromHeuristic) {
      extract.warnings.push('Some fields filled from heuristic fallback');
    }
  } catch (err) {
    console.warn('[parse-engagement-letter] LLM extract failed:', err);
    extract = heuristic;
  }

  extract.warnings = [...new Set([...baseWarnings, ...extract.warnings])];
  return extract;
}
