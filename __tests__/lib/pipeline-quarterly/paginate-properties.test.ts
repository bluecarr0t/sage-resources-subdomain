import {
  getPipelinePropertyPaginationMeta,
  paginatePipelinePropertyRows,
} from '@/lib/pipeline-quarterly/paginate-properties';

describe('getPipelinePropertyPaginationMeta', () => {
  it('computes page ranges for a full dataset', () => {
    expect(getPipelinePropertyPaginationMeta(250, 2, 100)).toEqual({
      page: 2,
      pageSize: 100,
      totalItems: 250,
      totalPages: 3,
      startIndex: 100,
      endIndex: 200,
    });
  });

  it('clamps page above total pages', () => {
    expect(getPipelinePropertyPaginationMeta(50, 9, 100).page).toBe(1);
  });

  it('handles empty datasets', () => {
    expect(getPipelinePropertyPaginationMeta(0, 3, 100)).toEqual({
      page: 1,
      pageSize: 100,
      totalItems: 0,
      totalPages: 1,
      startIndex: 0,
      endIndex: 0,
    });
  });
});

describe('paginatePipelinePropertyRows', () => {
  it('slices after the caller has already sorted the full list', () => {
    const sorted = ['a', 'b', 'c', 'd', 'e'];

    expect(paginatePipelinePropertyRows(sorted, 1, 2)).toEqual({
      rows: ['a', 'b'],
      meta: expect.objectContaining({
        page: 1,
        totalItems: 5,
        startIndex: 0,
        endIndex: 2,
      }),
    });

    expect(paginatePipelinePropertyRows(sorted, 3, 2).rows).toEqual(['e']);
  });
});
