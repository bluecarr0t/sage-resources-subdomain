# Move Comparables Search to Postgres — Migration Guide

Why this change is better and how to implement it.

---

## Current Architecture (Fetch-Then-Filter)

```
┌─────────────┐     ┌──────────────────────────────────────────────────────────┐
│   Client    │     │  API (Node.js)                                              │
│             │     │                                                             │
│  ?search=   │────▶│  1. Fetch up to 5,000 rows (pre-filter: OR on comp_name,   │
│  cabin tx   │     │     overview via ilike)                                     │
│             │     │  2. Transfer full rows over network                        │
│             │     │  3. Post-filter in memory: ALL terms must match across     │
│             │     │     comp_name, overview, reports.*, units.*, keywords      │
│             │     │  4. Apply isValidCompName                                  │
│             │     │  5. Group by comp_name                                     │
│             │     │  6. Sort, paginate in memory                               │
│             │     │  7. Return 50 rows                                        │
└─────────────┘     └──────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────────────────────────────────────────┐
                    │  Postgres                                                 │
                    │  - Returns up to 5,000 rows (pre-filter only)             │
                    │  - Full AND logic not applied at DB level                 │
                    └──────────────────────────────────────────────────────────┘
```

---

## Why Move Search to Postgres?

### 1. **Performance**

| Metric | Current | With Postgres search |
|--------|---------|----------------------|
| Rows transferred | Up to 5,000 | Only matching rows (often &lt;100) |
| Rows processed in Node | Up to 5,000 | 0 (or minimal) |
| Memory in API | High (full result set) | Low (paginated only) |
| Network payload | Large | Small |
| Response time | Grows with dataset | Stable (indexed) |

**Example:** Search "cabin texas" returns 12 matches. Current flow fetches 5,000 rows, filters to 12, then paginates. Postgres flow fetches 12 rows directly.

---

### 2. **Scalability**

- **Current:** As comparables grow (10k, 50k, 100k+), fetching 5,000 and filtering in Node will:
  - Hit the `MAX_FETCH` limit (results become incomplete)
  - Increase memory and CPU in the API
  - Slow down responses

- **Postgres:** Indexed search scales with data size. The database filters and paginates; the API receives only the requested page.

---

### 3. **Correctness**

- **Current:** Pre-filter uses OR (any term matches comp_name or overview). Post-filter applies AND. Rows that pass the pre-filter but fail the post-filter are still fetched and discarded. This wastes work and can cause confusion if `MAX_FETCH` truncates before we find enough matches.

- **Postgres:** Single source of truth. Filter logic lives in one place; no split between pre-filter and post-filter.

---

### 4. **Database strengths**

Postgres is built for:
- Indexed `ilike` (trigram) and full-text search
- Efficient joins and filtering
- Pagination with `LIMIT`/`OFFSET` or keyset
- Parallel query execution

Pushing search into Postgres uses these instead of reimplementing in Node.

---

### 5. **Operational simplicity**

- Less application logic
- Easier to tune (indexes, query plans)
- Better observability (slow query logs, `EXPLAIN ANALYZE`)

---

## Implementation Options

### Option A: Postgres RPC (Stored Procedure) — **Recommended**

**Idea:** A single function performs the full search (filter, group, sort, paginate) and returns the final result set.

**Pros:**
- Full control over logic (AND, state aliases, `isValidCompName`, grouping)
- One round-trip
- Can return JSON matching current API shape

**Cons:**
- More SQL to write and maintain
- Need to handle RLS/auth (service role bypasses RLS; RPC runs as definer)

---

### Option B: Denormalized `searchable_text` column

**Idea:** Add a column that concatenates all searchable text. Filter with `ilike` or full-text search on that column.

```sql
ALTER TABLE feasibility_comparables ADD COLUMN searchable_text TEXT;
-- Populated via trigger from fc + report + units + keywords
CREATE INDEX idx_feas_comps_searchable_trgm ON feasibility_comparables USING gin (searchable_text gin_trgm_ops);
```

**Pros:**
- Simple `WHERE searchable_text ILIKE '%term1%' AND searchable_text ILIKE '%term2%'`
- Uses existing PostgREST/Supabase client

**Cons:**
- Data lives in `reports` and `feasibility_comp_units` — need trigger or materialized view to keep `searchable_text` in sync
- Grouping still requires app logic (same comp in multiple reports)
- Redundant data

---

### Option C: Full-text search (`tsvector`)

**Idea:** Add a `tsvector` column; use `@@` and `ts_rank` for search and ranking.

**Pros:**
- Stemming (cabins → cabin), stop words
- Good for natural language

**Cons:**
- No typo tolerance
- State aliases (tx ↔ texas) need custom handling
- Same grouping/denormalization challenges as Option B

---

## Recommended Path: Option A (RPC)

Use a Postgres function that:
1. Joins `feasibility_comparables`, `reports`, `feasibility_comp_units`
2. Applies the full search filter (AND, all terms, all fields, state aliases)
3. Applies `isValidCompName`-style filters
4. Groups by `comp_name`
5. Sorts and paginates
6. Returns JSON in the shape the API expects

The API becomes a thin wrapper: validate auth, call RPC, return result.

---

## Implementation Steps

### Step 1: Create the search RPC

**File:** `scripts/migrations/comparables-search-rpc.sql`

1. Create a function `search_comparables` with parameters:
   - `p_search` text
   - `p_state` text (optional)
   - `p_unit_category` text (optional)
   - `p_min_adr`, `p_max_adr` numeric (optional)
   - `p_sort_by` text
   - `p_sort_dir` boolean
   - `p_page` int
   - `p_per_page` int

2. Implement search logic:
   - Split `p_search` into terms
   - For each row, build searchable text from: comp_name, overview, report (city, state, country, location, study_id), units (unit_type, unit_category), amenity_keywords
   - Apply state aliases (embed or use a lookup table)
   - Filter: all terms must match (AND)
   - Apply `isValidCompName`-style rules
   - Group by `LOWER(TRIM(comp_name))`
   - Sort by `p_sort_by` / `p_sort_dir`
   - Apply `LIMIT`/`OFFSET` for pagination

3. Return a JSON object: `{ comparables: [...], pagination: { page, per_page, total, total_pages } }`

4. Use `SECURITY DEFINER` and ensure the function runs with sufficient privileges (service role bypasses RLS).

**Note:** The RPC must replicate the grouping logic (same comp in multiple reports → one row with primary study's units). This is the most complex part.

---

### Step 2: Simplify the RPC with a view (optional)

To avoid duplicating join logic, create a view that denormalizes searchable data per comparable row:

```sql
CREATE OR REPLACE VIEW feasibility_comparables_search_view AS
SELECT
  fc.id,
  fc.comp_name,
  fc.overview,
  fc.amenity_keywords,
  fc.total_sites,
  fc.quality_score,
  fc.created_at,
  r.city,
  r.state,
  r.country,
  r.location,
  r.study_id,
  (SELECT string_agg(u.unit_type || ' ' || coalesce(u.unit_category, ''), ' ')
   FROM feasibility_comp_units u WHERE u.comparable_id = fc.id) AS unit_text
FROM feasibility_comparables fc
JOIN reports r ON r.id = fc.report_id;
```

The RPC queries this view and applies the filter. Grouping still requires custom logic (same comp_name across reports).

---

### Step 3: Update the API route

**File:** `app/api/admin/comparables/route.ts`

1. When `search` is present (and optionally when other filters are present), call the RPC instead of the current query:

```typescript
if (search) {
  const { data, error } = await supabaseAdmin.rpc('search_comparables', {
    p_search: search,
    p_state: state || null,
    p_unit_category: unitCategory || null,
    p_min_adr: minAdr ? parseFloat(minAdr) : null,
    p_max_adr: maxAdr ? parseFloat(maxAdr) : null,
    p_sort_by: sortBy,
    p_sort_dir: sortDir,
    p_page: page,
    p_per_page: perPage,
  });
  if (error) throw error;
  return NextResponse.json(data);
}
```

2. Keep the existing flow for the no-search case (or migrate that to the RPC as well for consistency).

3. Remove the in-memory post-filter and grouping logic for the search path.

---

### Step 4: Ensure indexes exist

**File:** `scripts/migrations/comparables-search-performance.sql` (already exists)

- Trigram indexes on `comp_name`, `overview` ✓
- Consider adding trigram on `reports.location` if search uses it heavily
- GIN index on `amenity_keywords` ✓

---

### Step 5: Handle auth and RLS

- The API uses `createServerClient()` (service role), which bypasses RLS.
- The RPC runs as `SECURITY DEFINER` (owner). Ensure the owner can read `feasibility_comparables`, `reports`, `feasibility_comp_units`.
- The API already checks `isManagedUser` and `isAllowedEmailDomain` before querying. The RPC does not need to re-check auth; it trusts the API.

---

### Step 6: Test

1. **Exact match:** "cabin texas" returns same results as before.
2. **State aliases:** "ga" finds Georgia, "georgia" finds GA.
3. **Job number:** "25-101A" finds matching study_ids.
4. **Unit types:** "rv site" finds comparables with that unit category.
5. **Keywords:** "spa" finds amenity_keywords containing spa.
6. **Pagination:** Page 2 returns correct slice.
7. **Sort:** Changing sort_by/sort_dir changes order.
8. **No results:** Empty result when no match.
9. **Grouping:** Same comp in multiple reports appears once with primary study's units.

---

### Step 7: Rollback plan

- Keep the old API logic behind a feature flag or env var.
- If the RPC has issues, switch back to the fetch-then-filter path.
- Remove the flag once the RPC is stable.

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Create view (optional) | 0.5 day |
| Implement RPC (search, filter, group, sort, paginate) | 2–3 days |
| State aliases in SQL | 0.5 day |
| API integration | 0.5 day |
| Testing and tuning | 1 day |
| **Total** | **~4–5 days** |

---

## Summary

| Aspect | Current | After migration |
|--------|---------|----------------|
| Rows fetched | Up to 5,000 | Only matching (paginated) |
| Filter location | Node.js | Postgres |
| Scalability | Limited by MAX_FETCH | Scales with indexes |
| Network | High | Low |
| Maintenance | Split logic | Single source of truth |

**Recommendation:** Implement the RPC-based search (Option A) to move the full search pipeline into Postgres, reduce data transfer and app memory, and improve scalability.
