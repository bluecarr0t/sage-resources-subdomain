import type { SiteExportTable } from '@/lib/sites-export/constants';

export type SitesExportFormat = 'xlsx' | 'csv';

export type SitesExportRequestBody = {
  sources: SiteExportTable[];
  countries: string[];
  /** Two-letter state abbreviations only (e.g. CA, NY). The parser truncates strings; do not send full names. */
  states: string[];
  unitTypes: string[];
  zip: string;
  radiusMiles: number | null;
  format: SitesExportFormat;
  /** From last successful count response; avoids a second full table scan when still valid. */
  cacheKey?: string;
};

export type SitesExportParsed = SitesExportRequestBody & {
  /** Resolved geo center when zip filter is active. */
  centerLat: number | null;
  centerLng: number | null;
  radiusMilesResolved: number | null;
};

export type SitesExportErrorResult = {
  ok: false;
  status: number;
  message: string;
};

export type SitesExportCountResult = {
  ok: true;
  count: number;
  /** Null when the ref list is too large to cache; export still works via a fresh scan. */
  cacheKey: string | null;
};

export type SitesExportFileResult = {
  ok: true;
  /** CSV streams; XLSX is buffered after streaming write (file-sized memory, not full grid). */
  body: ReadableStream<Uint8Array> | Buffer;
  contentType: string;
  filename: string;
};
