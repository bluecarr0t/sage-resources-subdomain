/** Leaf properties stored on supercluster point features (admin comps map). */
export interface CompsMapLeafProps {
  id: string;
  name: string;
  sourceIdx: number;
  avgAdr: number | null;
  website: string | null;
  totalSites: number | null;
  numUnits: number | null;
  /** When false, exclude num_units from glamping-only radius totals. */
  isGlamping: boolean;
  unitTypes: string[];
  studyId: string | null;
  reportYear: string | null;
}

export interface CompsMapGeoPointRow {
  lat: number;
  lng: number;
  leaf: CompsMapLeafProps;
}
