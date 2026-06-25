import { normalizePropertyTypeForForm } from '@/lib/glamping-property-types';

export type ReportSagePropertyPrefill = {
  property_name?: string | null;
  address_1?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  total_sites?: number | null;
  market_type?: string | null;
  resort_type?: string | null;
};

export type SagePropertyCreateDraft = {
  property_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  property_type: string;
  is_open: string;
  research_status: string;
  is_glamping_property: string;
  source: string;
  discovery_source: string;
  url: string;
  lat: string;
  lon: string;
  property_total_sites: string;
};

function mapReportMarketTypeToPropertyType(
  marketType: string | null | undefined,
  resortType: string | null | undefined
): string {
  const resort = (resortType ?? '').toLowerCase();
  if (resort.includes('rv resort')) return 'RV Resort';
  if (resort.includes('rv park')) return 'RV Park';
  if (resort.includes('marina')) return 'Marina';
  if (resort.includes('landscape')) return 'Landscape Hotel';
  if (resort.includes('glamping')) return 'Glamping';

  const market = (marketType ?? '').toLowerCase();
  if (market === 'rv') return 'RV Resort';
  if (market === 'glamping') return 'Glamping';
  if (market === 'marina') return 'Marina';
  if (market === 'landscape_hotel') return 'Landscape Hotel';
  if (market === 'rv_glamping') return 'Glamping';
  return 'Unknown';
}

export function buildSagePropertyDraftFromReport(
  prefill: ReportSagePropertyPrefill
): SagePropertyCreateDraft {
  return {
    property_name: prefill.property_name?.trim() ?? '',
    address: prefill.address_1?.trim() ?? '',
    city: prefill.city?.trim() ?? '',
    state: prefill.state?.trim() ?? '',
    zip_code: prefill.zip_code?.trim() ?? '',
    country: prefill.country?.trim() || 'United States',
    property_type: normalizePropertyTypeForForm(
      mapReportMarketTypeToPropertyType(prefill.market_type, prefill.resort_type)
    ),
    is_open: 'Under Construction',
    research_status: 'in_progress',
    is_glamping_property: 'Yes',
    source: 'Sage',
    discovery_source: 'Past Report',
    url: '',
    lat: prefill.latitude != null && Number.isFinite(prefill.latitude) ? String(prefill.latitude) : '',
    lon: prefill.longitude != null && Number.isFinite(prefill.longitude) ? String(prefill.longitude) : '',
    property_total_sites:
      prefill.total_sites != null && prefill.total_sites > 0 ? String(prefill.total_sites) : '',
  };
}

export function sagePropertyCreatePayloadFromDraft(
  draft: SagePropertyCreateDraft
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    property_name: draft.property_name.trim(),
    address: draft.address.trim() || null,
    city: draft.city.trim(),
    state: draft.state.trim(),
    zip_code: draft.zip_code.trim() || null,
    country: draft.country.trim() || 'United States',
    property_type: draft.property_type,
    is_open: draft.is_open,
    research_status: draft.research_status,
    is_glamping_property: draft.is_glamping_property,
    source: draft.source.trim() || 'Sage',
    discovery_source: draft.discovery_source.trim() || null,
    url: draft.url.trim() || null,
  };

  const lat = Number.parseFloat(draft.lat);
  const lon = Number.parseFloat(draft.lon);
  if (Number.isFinite(lat)) payload.lat = lat;
  if (Number.isFinite(lon)) payload.lon = lon;

  const sites = Number.parseInt(draft.property_total_sites, 10);
  if (Number.isFinite(sites) && sites > 0) payload.property_total_sites = sites;

  return payload;
}
