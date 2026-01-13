/**
 * Type definitions for RIDB API responses and database records
 */

// RIDB API Response Types
export interface RIDBCampsite {
  CampsiteID: string;
  FacilityID: string;
  CampsiteName: string;
  CampsiteType: string;
  TypeOfUse: string;
  Loop?: string;
  Site?: string;
  SiteAccess?: string;
  CampsiteAccessible?: boolean;
  CampsiteReservable?: boolean;
  CampsiteLongitude?: number;
  CampsiteLatitude?: number;
  CreatedDate?: string;
  LastUpdatedDate?: string;
  Attributes?: RIDBAttribute[];
  Media?: RIDBMedia[];
  PermittedEquipment?: RIDBPermittedEquipment[];
  EntityMedia?: RIDBEntityMedia[];
}

export interface RIDBAttribute {
  AttributeID: string;
  AttributeName: string;
  AttributeValue?: string;
}

export interface RIDBMedia {
  MediaID: string;
  MediaType: string;
  EntityType: string;
  EntityID: string;
  Title?: string;
  Subtitle?: string;
  Description?: string;
  Credits?: string;
  MediaTypeID?: string;
  URL?: string;
  Width?: number;
  Height?: number;
  EmbedCode?: string;
}

export interface RIDBEntityMedia {
  EntityMediaID: string;
  MediaID: string;
  EntityType: string;
  EntityID: string;
  Title?: string;
  Subtitle?: string;
  Description?: string;
  Credits?: string;
  MediaTypeID?: string;
  URL?: string;
  Width?: number;
  Height?: number;
  EmbedCode?: string;
}

export interface RIDBPermittedEquipment {
  PermittedEquipmentID: string;
  EquipmentName: string;
  MaxLength?: number;
}

export interface RIDBFacility {
  FacilityID: string;
  FacilityName: string;
  FacilityTypeDescription?: string;
  FacilityTypeID?: string;
  FacilityDescription?: string;
  FacilityDirections?: string;
  FacilityPhone?: string;
  FacilityEmail?: string;
  FacilityReservationURL?: string;
  FacilityMapURL?: string;
  FacilityUseFeeDescription?: string;
  FacilityLongitude?: number;
  FacilityLatitude?: number;
  Reservable?: boolean;
  Enabled?: boolean;
  LastUpdatedDate?: string;
  OrganizationID?: string;
  ParentRecAreaID?: string;
  ParentRecAreaName?: string;
  RecAreaID?: string;
  RecAreaName?: string;
  FacilityAddresses?: RIDBFacilityAddress[];
  FacilityMedia?: RIDBMedia[];
}

export interface RIDBFacilityAddress {
  FacilityAddressID: string;
  FacilityID: string;
  FacilityAddressType: string;
  FacilityStreetAddress1?: string;
  FacilityStreetAddress2?: string;
  FacilityStreetAddress3?: string;
  City?: string;
  PostalCode?: string;
  AddressStateCode?: string;
  AddressCountryCode?: string;
  FacilityLongitude?: number;
  FacilityLatitude?: number;
}

export interface RIDBRecArea {
  RecAreaID: string;
  RecAreaName: string;
  RecAreaDescription?: string;
  RecAreaDirections?: string;
  RecAreaPhone?: string;
  RecAreaEmail?: string;
  RecAreaReservationURL?: string;
  RecAreaMapURL?: string;
  RecAreaLongitude?: number;
  RecAreaLatitude?: number;
  LastUpdatedDate?: string;
  OrganizationID?: string;
  RecAreaAddresses?: RIDBRecAreaAddress[];
  RecAreaMedia?: RIDBMedia[];
}

export interface RIDBRecAreaAddress {
  RecAreaAddressID: string;
  RecAreaID: string;
  RecAreaAddressType: string;
  RecAreaStreetAddress1?: string;
  RecAreaStreetAddress2?: string;
  RecAreaStreetAddress3?: string;
  City?: string;
  PostalCode?: string;
  AddressStateCode?: string;
  AddressCountryCode?: string;
  RecAreaLongitude?: number;
  RecAreaLatitude?: number;
}

export interface RIDBOrganization {
  OrganizationID: string;
  OrganizationName: string;
  OrganizationType?: string;
  OrganizationAbbrev?: string;
  OrganizationURL?: string;
  OrganizationPhone?: string;
  OrganizationEmail?: string;
}

export interface RIDBPaginatedResponse<T> {
  RECDATA: T[];
  METADATA: {
    RESULTS: {
      CURRENT_COUNT: number;
      TOTAL_COUNT: number;
    };
  };
}

// Database Record Types
export interface RIDBCampsiteRecord {
  id?: number;
  ridb_campsite_id: string;
  name: string;
  campsite_type: string | null;
  campsite_use_type: string | null;
  loop: string | null;
  site: string | null;
  site_access: string | null;
  campsite_accessible: boolean | null;
  campsite_reservable: boolean | null;
  campsite_booking_url: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  created_date: string | null;
  last_updated_date: string | null;
  facility_id: string | null;
  facility_name: string | null;
  facility_type: string | null;
  facility_latitude: number | null;
  facility_longitude: number | null;
  facility_address: string | null;
  facility_city: string | null;
  facility_state: string | null;
  facility_postal_code: string | null;
  facility_reservable: boolean | null;
  facility_reservation_url: string | null;
  facility_use_fee_description: string | null;
  facility_website_url: string | null;
  facility_phone: string | null;
  facility_email: string | null;
  recarea_id: string | null;
  recarea_name: string | null;
  recarea_latitude: number | null;
  recarea_longitude: number | null;
  organization_id: string | null;
  organization_name: string | null;
  attributes: RIDBAttribute[] | null;
  permitted_equipment: RIDBPermittedEquipment[] | null;
  media: RIDBMedia[] | null;
  entity_media: RIDBEntityMedia[] | null;
  created_at?: string;
  updated_at?: string;
  last_synced_at: string | null;
  data_completeness_score: number | null;
}

export interface RIDBCollectionProgress {
  id?: number;
  collection_type: string;
  last_processed_facility_id: string | null;
  last_processed_campsite_id: string | null;
  total_facilities_processed: number;
  total_campsites_processed: number;
  last_updated: string;
  status: 'in_progress' | 'completed' | 'paused' | 'error';
  error_message: string | null;
}

// Helper type for campsite collection batch
export interface CampsiteBatch {
  campsites: RIDBCampsiteRecord[];
  facilityId: string;
  lastCampsiteId: string | null;
}

