/**
 * Shared RIDB campsite collection helpers (transform, enrich, facility filter).
 */

import type { RIDBApiClient } from './ridb-api';
import type {
  RIDBCampsite,
  RIDBFacility,
  RIDBRecArea,
  RIDBCampsiteRecord,
  RidbSyncMode,
} from './types/ridb';

export type { RidbSyncMode };

export const CAMPING_FACILITY_KEYWORDS = [
  'campground',
  'camping',
  'rv',
  'tent',
  'campsite',
  'backcountry',
  'primitive',
  'group camp',
] as const;

export const DEFAULT_BATCH_SIZE = 25;
export const DEFAULT_COLLECTION_BATCH_SIZE = 100;
export const FACILITIES_PAGE_LIMIT = 50;

export interface RidbCollectCliOptions {
  mode: RidbSyncMode;
  resetProgress: boolean;
}

export function parseRidbCollectCliArgs(argv: string[] = process.argv): RidbCollectCliOptions {
  let mode: RidbSyncMode = 'full';
  let resetProgress = false;

  for (const arg of argv.slice(2)) {
    if (arg === '--reset-progress') {
      resetProgress = true;
    } else if (arg.startsWith('--mode=')) {
      const value = arg.slice('--mode='.length);
      if (value === 'full' || value === 'incremental') {
        mode = value;
      } else {
        throw new Error(`Invalid --mode value: ${value}. Use full or incremental.`);
      }
    }
  }

  return { mode, resetProgress };
}

export function isCampingFacility(facility: RIDBFacility): boolean {
  const facilityType = (facility.FacilityTypeDescription || '').toLowerCase();
  const facilityName = (facility.FacilityName || '').toLowerCase();

  return CAMPING_FACILITY_KEYWORDS.some(
    (keyword) => facilityType.includes(keyword) || facilityName.includes(keyword)
  );
}

function hasJsonArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function getApiCampsiteFields(campsite: RIDBCampsite): Record<string, unknown> {
  return campsite as Record<string, unknown>;
}

export function campsiteHasAttributes(campsite: RIDBCampsite): boolean {
  const api = getApiCampsiteFields(campsite);
  return hasJsonArray(campsite.Attributes) || hasJsonArray(api.ATTRIBUTES);
}

export function campsiteHasMedia(campsite: RIDBCampsite): boolean {
  const api = getApiCampsiteFields(campsite);
  return (
    hasJsonArray(campsite.Media) ||
    hasJsonArray(api.MEDIA) ||
    hasJsonArray(campsite.EntityMedia) ||
    hasJsonArray(api.ENTITYMEDIA)
  );
}

export function facilityNeedsDetailFetch(facility: RIDBFacility | null): boolean {
  if (!facility?.FacilityID) return false;
  const api = facility as Record<string, unknown>;
  const hasLink = hasJsonArray(api.LINK);
  const hasAddresses = hasJsonArray(facility.FacilityAddresses);
  const hasFee = Boolean(facility.FacilityUseFeeDescription);
  return !hasLink || !hasAddresses || !hasFee;
}

export function facilityHasRecAreaSummary(facility: RIDBFacility | null): boolean {
  if (!facility) return false;
  return Boolean(
    facility.RecAreaName ||
      facility.ParentRecAreaName ||
      (facility.RecAreaID && facility.RecAreaName)
  );
}

export function calculateCompletenessScore(campsite: RIDBCampsiteRecord): number {
  const fields: (keyof RIDBCampsiteRecord)[] = [
    'name',
    'campsite_type',
    'campsite_use_type',
    'loop',
    'site',
    'campsite_accessible',
    'latitude',
    'longitude',
    'created_date',
    'last_updated_date',
    'facility_name',
    'facility_address',
    'facility_city',
    'facility_state',
    'facility_reservation_url',
    'facility_use_fee_description',
    'facility_website_url',
    'campsite_reservable',
    'campsite_booking_url',
    'recarea_name',
    'organization_name',
    'attributes',
    'permitted_equipment',
    'media',
    'entity_media',
  ];

  let score = 0;
  for (const field of fields) {
    const value = campsite[field];
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) score += 1;
      } else {
        score += 1;
      }
    }
  }

  return Math.round((score / fields.length) * 100);
}

export function convertCampsiteToRecord(
  campsite: RIDBCampsite,
  facility: RIDBFacility | null,
  recArea: RIDBRecArea | null,
  organizationName: string | null
): RIDBCampsiteRecord {
  const primaryAddress = facility?.FacilityAddresses?.[0];
  const facilityLinks = (facility as { LINK?: { LinkType?: string; URL?: string }[] })?.LINK || [];
  const websiteLink = facilityLinks.find(
    (link) =>
      link?.LinkType?.toLowerCase().includes('website') ||
      link?.LinkType?.toLowerCase().includes('official')
  );
  const facilityWebsiteUrl = websiteLink?.URL || null;
  const apiCampsite = getApiCampsiteFields(campsite);

  const record: RIDBCampsiteRecord = {
    ridb_campsite_id: campsite.CampsiteID,
    name: campsite.CampsiteName || 'Unnamed Campsite',
    campsite_type: campsite.CampsiteType || null,
    campsite_use_type: campsite.TypeOfUse || null,
    loop: campsite.Loop || null,
    site: campsite.Site || null,
    site_access: campsite.SiteAccess || null,
    campsite_accessible: campsite.CampsiteAccessible ?? null,
    campsite_reservable:
      campsite.CampsiteReservable ??
      (typeof apiCampsite.CAMPSITERESERVABLE === 'boolean' ? apiCampsite.CAMPSITERESERVABLE : null),
    campsite_booking_url: campsite.CampsiteID
      ? `https://www.recreation.gov/camping/campsites/${campsite.CampsiteID}`
      : null,
    latitude:
      campsite.CampsiteLatitude && campsite.CampsiteLatitude !== 0 ? campsite.CampsiteLatitude : null,
    longitude:
      campsite.CampsiteLongitude && campsite.CampsiteLongitude !== 0 ? campsite.CampsiteLongitude : null,
    description: null,
    created_date: campsite.CreatedDate || null,
    last_updated_date: campsite.LastUpdatedDate || null,
    facility_id: campsite.FacilityID || null,
    facility_name: facility?.FacilityName || null,
    facility_type: facility?.FacilityTypeDescription || null,
    facility_latitude: facility?.FacilityLatitude || null,
    facility_longitude: facility?.FacilityLongitude || null,
    facility_address: primaryAddress?.FacilityStreetAddress1 || null,
    facility_city: primaryAddress?.City || null,
    facility_state: primaryAddress?.AddressStateCode || null,
    facility_postal_code: primaryAddress?.PostalCode || null,
    facility_reservable: facility?.Reservable || null,
    facility_reservation_url: facility?.FacilityReservationURL || null,
    facility_use_fee_description: facility?.FacilityUseFeeDescription || null,
    facility_website_url: facilityWebsiteUrl,
    facility_phone: facility?.FacilityPhone || null,
    facility_email: facility?.FacilityEmail || null,
    recarea_id: facility?.RecAreaID || facility?.ParentRecAreaID || null,
    recarea_name: recArea?.RecAreaName || facility?.RecAreaName || facility?.ParentRecAreaName || null,
    recarea_latitude: recArea?.RecAreaLatitude || null,
    recarea_longitude: recArea?.RecAreaLongitude || null,
    organization_id: facility?.OrganizationID || null,
    organization_name: organizationName || null,
    attributes: campsite.Attributes || (apiCampsite.ATTRIBUTES as RIDBCampsiteRecord['attributes']) || null,
    permitted_equipment:
      campsite.PermittedEquipment ||
      (apiCampsite.PERMITTEDEQUIPMENT as RIDBCampsiteRecord['permitted_equipment']) ||
      null,
    media: campsite.Media || (apiCampsite.MEDIA as RIDBCampsiteRecord['media']) || null,
    entity_media:
      campsite.EntityMedia || (apiCampsite.ENTITYMEDIA as RIDBCampsiteRecord['entity_media']) || null,
    last_synced_at: new Date().toISOString(),
    data_completeness_score: null,
  };

  record.data_completeness_score = calculateCompletenessScore(record);
  return record;
}

/** Normalize RIDB LastUpdatedDate for comparison (API may omit timezone). */
export function normalizeRidbTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toISOString();
}

export async function enrichCampsite(
  ridbClient: RIDBApiClient,
  campsite: RIDBCampsite,
  facility: RIDBFacility | null,
  organizationName: string | null
): Promise<RIDBCampsiteRecord> {
  let fullFacility = facility;
  if (facilityNeedsDetailFetch(facility)) {
    const fetchedFacility = await ridbClient.getFacility(facility!.FacilityID);
    if (fetchedFacility) {
      fullFacility = fetchedFacility;
    }
  }

  const recAreaId = fullFacility?.RecAreaID || fullFacility?.ParentRecAreaID;
  const needsRecArea = Boolean(recAreaId) && !facilityHasRecAreaSummary(fullFacility);

  const [attributes, media, recArea] = await Promise.all([
    campsiteHasAttributes(campsite)
      ? Promise.resolve([])
      : ridbClient.getCampsiteAttributes(campsite.CampsiteID),
    campsiteHasMedia(campsite) ? Promise.resolve([]) : ridbClient.getCampsiteMedia(campsite.CampsiteID),
    needsRecArea && recAreaId
      ? ridbClient.getRecArea(recAreaId)
      : Promise.resolve(null),
  ]);

  const apiCampsite = getApiCampsiteFields(campsite);
  const enrichedCampsite: RIDBCampsite = {
    ...campsite,
    Attributes:
      campsite.Attributes ||
      (apiCampsite.ATTRIBUTES as RIDBCampsite['Attributes']) ||
      (attributes.length > 0 ? attributes : undefined),
    Media:
      campsite.Media ||
      (apiCampsite.MEDIA as RIDBCampsite['Media']) ||
      (media.length > 0 ? media : undefined),
    PermittedEquipment:
      campsite.PermittedEquipment || (apiCampsite.PERMITTEDEQUIPMENT as RIDBCampsite['PermittedEquipment']),
    EntityMedia: campsite.EntityMedia || (apiCampsite.ENTITYMEDIA as RIDBCampsite['EntityMedia']),
  };

  return convertCampsiteToRecord(enrichedCampsite, fullFacility, recArea, organizationName);
}
