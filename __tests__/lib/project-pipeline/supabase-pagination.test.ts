import { fetchAllSupabasePages } from '@/lib/project-pipeline/supabase-pagination';

describe('fetchAllSupabasePages', () => {
  it('loads multiple pages until a short page is returned', async () => {
    const pages = [
      Array.from({ length: 1000 }, (_, index) => ({ id: index })),
      Array.from({ length: 250 }, (_, index) => ({ id: index + 1000 })),
    ];
    let pageIndex = 0;

    const rows = await fetchAllSupabasePages(async ({ from, to }) => {
      const page = pages[pageIndex] ?? [];
      pageIndex += 1;
      return {
        data: page,
        error: null,
      };
    });

    expect(rows).toHaveLength(1250);
    expect(pageIndex).toBe(2);
    expect(rows[0]?.id).toBe(0);
    expect(rows.at(-1)?.id).toBe(1249);
  });

  it('throws when a page request fails', async () => {
    await expect(
      fetchAllSupabasePages(async () => ({
        data: null,
        error: { message: 'boom' },
      }))
    ).rejects.toThrow('boom');
  });
});
