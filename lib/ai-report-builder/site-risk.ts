/**
 * Site risk connectors: FEMA NFHL flood zone, FWS wetlands, FEMA NRI wildfire.
 * Soft-fail individually; results feed Site Analysis labels.
 */

export interface SiteRiskResult {
  flood: {
    zone: string | null;
    panel: string | null;
    source: string;
  };
  wetlands: {
    present: boolean | null;
    note: string | null;
    source: string;
  };
  wildfire: {
    eal_rating: string | null;
    risk_score: number | null;
    source: string;
  };
  fetched_at: string;
}

function emptyRisk(): SiteRiskResult {
  return {
    flood: { zone: null, panel: null, source: 'fema_nfhl' },
    wetlands: { present: null, note: null, source: 'fws_wetlands' },
    wildfire: { eal_rating: null, risk_score: null, source: 'fema_nri' },
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Query FEMA NFHL MapServer for flood zone at a point.
 * @see https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer
 */
async function fetchFloodZone(lat: number, lng: number): Promise<SiteRiskResult['flood']> {
  const geometry = JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } });
  // Layer 28 = Flood Hazard Zones (common NFHL public service layer; may vary)
  const url =
    'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query?' +
    new URLSearchParams({
      geometry,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'FLD_ZONE,STATIC_BFE,SFHA_TF,DFIRM_ID',
      returnGeometry: 'false',
      f: 'json',
    }).toString();

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`NFHL HTTP ${res.status}`);
  const json = (await res.json()) as {
    features?: Array<{ attributes?: Record<string, unknown> }>;
  };
  const attrs = json.features?.[0]?.attributes;
  if (!attrs) {
    return { zone: 'X (or unmapped)', panel: null, source: 'fema_nfhl' };
  }
  const zone = attrs.FLD_ZONE != null ? String(attrs.FLD_ZONE) : null;
  const panel = attrs.DFIRM_ID != null ? String(attrs.DFIRM_ID) : null;
  return { zone, panel, source: 'fema_nfhl' };
}

/**
 * FWS Wetlands Mapper FeatureServer — presence near point (buffer ~50m).
 */
async function fetchWetlands(lat: number, lng: number): Promise<SiteRiskResult['wetlands']> {
  // Small envelope around the point (~0.001 deg ≈ 100m)
  const d = 0.001;
  const geometry = JSON.stringify({
    xmin: lng - d,
    ymin: lat - d,
    xmax: lng + d,
    ymax: lat + d,
    spatialReference: { wkid: 4326 },
  });
  const url =
    'https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0/query?' +
    new URLSearchParams({
      geometry,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'WETLAND_TYPE,ATTRIBUTE',
      returnGeometry: 'false',
      returnCountOnly: 'false',
      f: 'json',
    }).toString();

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`Wetlands HTTP ${res.status}`);
  const json = (await res.json()) as {
    features?: Array<{ attributes?: Record<string, unknown> }>;
    count?: number;
  };
  const count = json.features?.length ?? json.count ?? 0;
  const firstType = json.features?.[0]?.attributes?.WETLAND_TYPE;
  return {
    present: count > 0,
    note:
      count > 0
        ? `Wetland features near site${firstType ? ` (${String(firstType)})` : ''}`
        : 'No FWS wetland features in immediate vicinity',
    source: 'fws_wetlands',
  };
}

/**
 * FEMA National Risk Index — county-level wildfire EAL via open data API.
 * Uses lat/lng identify against the NRI MapServer when available.
 */
async function fetchWildfireRisk(lat: number, lng: number): Promise<SiteRiskResult['wildfire']> {
  const geometry = JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } });
  // NRI Census Tracts layer (layer index may change; soft-fail)
  const url =
    'https://services.arcgis.com/XG15cJAlne2vxxpK/arcgis/rest/services/National_Risk_Index_Census_Tracts/FeatureServer/0/query?' +
    new URLSearchParams({
      geometry,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'WFIR_RISKR,WFIR_EALR,COUNTY,STATEABBRV',
      returnGeometry: 'false',
      f: 'json',
    }).toString();

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`NRI HTTP ${res.status}`);
  const json = (await res.json()) as {
    features?: Array<{ attributes?: Record<string, unknown> }>;
  };
  const attrs = json.features?.[0]?.attributes;
  if (!attrs) {
    return { eal_rating: null, risk_score: null, source: 'fema_nri' };
  }
  const rating =
    attrs.WFIR_EALR != null
      ? String(attrs.WFIR_EALR)
      : attrs.WFIR_RISKR != null
        ? String(attrs.WFIR_RISKR)
        : null;
  return {
    eal_rating: rating,
    risk_score: null,
    source: 'fema_nri',
  };
}

export async function fetchSiteRisk(lat: number, lng: number): Promise<SiteRiskResult> {
  const result = emptyRisk();
  const [flood, wetlands, wildfire] = await Promise.allSettled([
    fetchFloodZone(lat, lng),
    fetchWetlands(lat, lng),
    fetchWildfireRisk(lat, lng),
  ]);
  if (flood.status === 'fulfilled') result.flood = flood.value;
  else console.warn('[site-risk] flood:', flood.reason);
  if (wetlands.status === 'fulfilled') result.wetlands = wetlands.value;
  else console.warn('[site-risk] wetlands:', wetlands.reason);
  if (wildfire.status === 'fulfilled') result.wildfire = wildfire.value;
  else console.warn('[site-risk] wildfire:', wildfire.reason);
  result.fetched_at = new Date().toISOString();
  return result;
}

export function formatSiteRiskForPrompt(risk: SiteRiskResult | undefined): string {
  if (!risk) return '';
  const lines = [
    'Site risk data (use for Flood Zone / Wetlands / Wildfire labels; do not invent):',
    `  Flood zone: ${risk.flood.zone ?? 'Not yet verified; analyst to confirm.'}${risk.flood.panel ? ` (panel ${risk.flood.panel})` : ''} [${risk.flood.source}]`,
    `  Wetlands: ${
      risk.wetlands.present == null
        ? 'Not yet verified; analyst to confirm.'
        : risk.wetlands.present
          ? risk.wetlands.note ?? 'Present near site'
          : risk.wetlands.note ?? 'Not indicated near site'
    } [${risk.wetlands.source}]`,
    `  Wildfire EAL/risk: ${risk.wildfire.eal_rating ?? 'Not yet verified; analyst to confirm.'} [${risk.wildfire.source}]`,
  ];
  return lines.join('\n');
}
