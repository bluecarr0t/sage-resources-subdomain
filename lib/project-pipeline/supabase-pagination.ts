export const PROJECT_PIPELINE_SUPABASE_PAGE_SIZE = 1000;

type SupabasePageError = { message: string } | null;

/** Load every row from a Supabase query that may exceed the default 1k row cap. */
export async function fetchAllSupabasePages<TRow>(
  fetchPage: (range: { from: number; to: number }) => Promise<{
    data: TRow[] | null;
    error: SupabasePageError;
  }>,
  options?: { pageSize?: number }
): Promise<TRow[]> {
  const pageSize = options?.pageSize ?? PROJECT_PIPELINE_SUPABASE_PAGE_SIZE;
  const rows: TRow[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage({ from, to });
    if (error) {
      throw new Error(error.message);
    }

    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}
