export const PIPELINE_PROPERTY_OPEN_PAGE_SIZE = 100;

export type PipelinePropertyPaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
};

export function getPipelinePropertyPaginationMeta(
  totalItems: number,
  page: number,
  pageSize: number
): PipelinePropertyPaginationMeta {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * safePageSize;
  const endIndex = totalItems === 0 ? 0 : Math.min(startIndex + safePageSize, totalItems);

  return {
    page: safePage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
  };
}

export function paginatePipelinePropertyRows<T>(
  rows: readonly T[],
  page: number,
  pageSize: number
): { rows: T[]; meta: PipelinePropertyPaginationMeta } {
  const meta = getPipelinePropertyPaginationMeta(rows.length, page, pageSize);

  if (rows.length === 0) {
    return { rows: [], meta };
  }

  return {
    rows: rows.slice(meta.startIndex, meta.endIndex),
    meta,
  };
}
