import {
  CAMPSPOT_RV_OVERVIEW_MAX_ROWS,
  ROVERPASS_RV_OVERVIEW_MAX_ROWS,
} from '@/lib/rv-industry-overview/campspot-fetch-cap';

export type RvOverviewSourceScanMeta = {
  rowsScanned: number;
  maxRows: number;
  /** True when scan stopped because row cap was reached (table may have more rows). */
  hitRowCap: boolean;
};

export type RvOverviewScanMeta = {
  campspot: RvOverviewSourceScanMeta;
  roverpass: RvOverviewSourceScanMeta;
};

export function buildSourceScanMeta(
  rowsScanned: number,
  maxRows: number,
  hitRowCap: boolean
): RvOverviewSourceScanMeta {
  return { rowsScanned, maxRows, hitRowCap };
}

export function emptyRvOverviewScanMeta(): RvOverviewScanMeta {
  return {
    campspot: buildSourceScanMeta(0, CAMPSPOT_RV_OVERVIEW_MAX_ROWS, false),
    roverpass: buildSourceScanMeta(0, ROVERPASS_RV_OVERVIEW_MAX_ROWS, false),
  };
}

export function rvOverviewScanMetaAnyHitCap(meta: RvOverviewScanMeta): boolean {
  return meta.campspot.hitRowCap || meta.roverpass.hitRowCap;
}
