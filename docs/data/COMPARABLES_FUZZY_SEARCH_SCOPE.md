# Fuzzy / Typo-Tolerant Search — Feature Scope

Scope document for adding typo-tolerant search to `/admin/comparables`.

---

## Problem Statement

Current search requires **exact substring matches**. Typos or slight variations return no results:

| User types | Expected match | Current result |
|------------|----------------|----------------|
| `cabbin` | "Cabin Resort" | No results |
| `texas` | "Texas" | Match ✓ |
| `califonia` | "California" | No results |
| `glampng` | "Glamping" | No results |
| `25-101A` | "25-101A-01" (job number) | Partial match ✓ |

---

## Goals

1. **Tolerate common typos** — 1–2 character errors (transposition, missing, extra)
2. **Handle variations** — "glamping" vs "glampng", "cabin" vs "cabins"
3. **Preserve exact match priority** — Exact matches should rank higher than fuzzy matches
4. **Minimal UX change** — No new toggles or modes; works transparently
5. **Performance** — Stay within current latency budget (~500ms)

---

## Technical Approaches

### Option A: Postgres `pg_trgm` similarity

**How it works:** The `pg_trgm` extension (already enabled for indexes) provides `similarity(text, text)` (0–1) and `%` operator for similarity matching. Trigrams are 3-character sequences; similar strings share more trigrams.

```sql
-- similarity('cabin', 'cabbin') ≈ 0.83
-- similarity('texas', 'texs') ≈ 0.75
SELECT * FROM feasibility_comparables
WHERE similarity(comp_name, 'cabbin') > 0.3;
```

**Pros:**
- Already have `pg_trgm` and trigram indexes
- Native Postgres, no external services
- Works well for typos and short words
- Can use `%` operator: `comp_name % 'cabbin'`

**Cons:**
- Requires DB-level logic; current flow fetches then filters in Node
- Similarity threshold is tunable but arbitrary (0.3, 0.4, etc.)
- Joins with `reports` and `feasibility_comp_units` complicate the query
- May need RPC/stored procedure to encapsulate

**Effort:** Medium (2–3 days)

---

### Option B: Postgres full-text search (`tsvector` / `tsquery`)

**How it works:** Build a `tsvector` from searchable text, use `ts_rank` and `plainto_tsquery` with a dictionary. Supports stemming ("cabins" → "cabin") and stop words.

```sql
-- "cabins texas" matches "cabin" and "Texas" via stemming
SELECT * FROM feasibility_comparables
WHERE to_tsvector('english', comp_name) @@ plainto_tsquery('english', 'cabins texas');
```

**Pros:**
- Built-in stemming (plural/singular, etc.)
- Good for natural language
- Can add `tsvector` column + GIN index for speed

**Cons:**
- **Does not handle typos** — "cabbin" won't match "cabin"
- Better for word variations than character errors
- Requires schema change (new column or generated column)

**Effort:** Medium (2–3 days) — but does **not** solve typo tolerance

---

### Option C: Levenshtein distance

**How it works:** `levenshtein(a, b)` returns edit distance. Match when distance ≤ threshold (e.g. 1–2 for short words).

```sql
-- fuzzystrmatch extension
SELECT * FROM feasibility_comparables
WHERE levenshtein(lower(comp_name), 'cabbin') <= 2;
```

**Pros:**
- Precise control over "how different" is acceptable
- Good for short strings (job numbers, state codes)

**Cons:**
- **No index support** — full table scan
- Expensive for long text
- Need to check every searchable field
- `fuzzystrmatch` extension required

**Effort:** Medium — but **poor performance** at scale

---

### Option D: Two-phase search (exact first, fuzzy fallback)

**How it works:**
1. Run current exact search
2. If 0 results and query has 1–2 terms, run fuzzy search
3. Merge/dedupe; show fuzzy results with optional "Did you mean?" or subtle indicator

**Pros:**
- Exact matches stay fast and ranked first
- Fuzzy only when needed (no results)
- User gets results instead of empty state

**Cons:**
- Two round-trips when no exact match
- Need to define "when to fuzzy" (term length, count, etc.)

**Effort:** Medium (2–3 days)

---

### Option E: Client-side fuzzy (e.g. Fuse.js)

**How it works:** Fetch a broader set (or all) comparables, run Fuse.js or similar in the browser.

**Pros:**
- No backend changes
- Rich fuzzy algorithms (keyboard distance, etc.)

**Cons:**
- **Does not scale** — can't fetch 5,000+ rows for client-side filter
- Defeats purpose of server-side pagination
- Not viable for current architecture

**Effort:** N/A — not recommended

---

### Option F: External search (Typesense, Meilisearch, Algolia)

**How it works:** Sync comparables to a dedicated search engine; query it instead of Postgres.

**Pros:**
- Typo tolerance, ranking, facets built-in
- Very fast
- Handles large datasets

**Cons:**
- New infrastructure and sync pipeline
- Data duplication
- Cost (hosted) or ops (self-hosted)
- Overkill for current scale

**Effort:** High (1–2 weeks)

---

## Recommended Approach: **Option A + D (pg_trgm + two-phase)**

### Phase 1: Add fuzzy as fallback when no exact results

1. **Keep current exact search** — No change to happy path
2. **On 0 results:** If search has 1–3 terms (each ≥ 2 chars), call a **Postgres RPC** that uses `pg_trgm` similarity
3. **RPC returns** raw comparable IDs matching `similarity(comp_name, term) > 0.4` OR `similarity(overview, term) > 0.4` for any term
4. **API fetches** those IDs with existing query, applies grouping/pagination
5. **Optional UI:** "No exact matches. Showing similar results:" when fuzzy was used

### Phase 2 (optional): Always include fuzzy, rank by relevance

- Run exact + fuzzy in parallel or combined
- Score: exact match = 1.0, similarity match = similarity score
- Sort by score, then by existing sort column

---

## Implementation Details (Phase 1)

### 1. Postgres RPC

```sql
CREATE OR REPLACE FUNCTION search_comparables_fuzzy(p_terms text[], p_similarity_threshold float DEFAULT 0.4)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  term text;
  comp record;
  match bool;
BEGIN
  FOR comp IN
    SELECT fc.id, fc.comp_name, fc.overview
    FROM feasibility_comparables fc
    JOIN reports r ON r.id = fc.report_id
    -- RLS / auth handled by caller
  LOOP
    match := true;
    FOREACH term IN ARRAY p_terms LOOP
      match := match AND (
        similarity(lower(coalesce(comp.comp_name,'')), term) > p_similarity_threshold
        OR similarity(lower(coalesce(comp.overview,'')), term) > p_similarity_threshold
        -- Could add reports.location, etc.
      );
    END LOOP;
    IF match THEN
      RETURN NEXT comp.id;
    END IF;
  END LOOP;
END;
$$;
```

**Note:** This is a simplified sketch. Full implementation would need to:
- Include all searchable fields (reports, units, keywords)
- Respect state aliases
- Handle grouped comparables (filter before grouping)
- Apply `isValidCompName`-style filters

### 2. API changes

- In `app/api/admin/comparables/route.ts`:
  - After post-filter, if `filteredData.length === 0` and `searchTerms.length` between 1 and 3:
  - Call `supabase.rpc('search_comparables_fuzzy', { p_terms: searchTerms, p_similarity_threshold: 0.4 })`
  - Fetch rows by returned IDs
  - Apply grouping, pagination, `isValidCompName`
  - Add `fuzzy: true` to response so client can show "similar results" message

### 3. Client changes

- Optional: When `pagination.fuzzy === true`, show a subtle banner: "No exact matches. Showing similar results."

### 4. Similarity threshold

- **0.3** — Very loose ("cabbin" matches "cabin", "cab", "carbon")
- **0.4** — Balanced (recommended starting point)
- **0.5** — Stricter (fewer false positives, may miss some typos)

Tune based on real queries.

---

## Searchable Fields (for fuzzy)

| Field | Source | Notes |
|-------|--------|-------|
| comp_name | feasibility_comparables | Primary; high impact |
| overview | feasibility_comparables | Secondary |
| city, state, country, location | reports | Via join |
| study_id | reports | Job numbers; exact often better |
| unit_type, unit_category | feasibility_comp_units | Via join |
| amenity_keywords | feasibility_comparables | Array; overlap vs similarity |

**Recommendation:** Start with `comp_name` and `overview` only. Expand if needed.

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Postgres RPC (comp_name, overview) | 1 day |
| API integration (fallback logic) | 0.5 day |
| Testing and threshold tuning | 0.5 day |
| Optional UI indicator | 0.25 day |
| **Total** | **~2–2.5 days** |

---

## Risks & Considerations

1. **False positives** — Loose threshold may match unrelated properties (e.g. "lake" matching "leak")
2. **Performance** — RPC with similarity on every row may be slow; consider limiting to first N rows
3. **Job numbers** — "25-101A" vs "25-101A-01" — trigram similarity may work; test
4. **State codes** — "TX" vs "texas" — keep existing STATE_ALIASES; similarity adds little
5. **Threshold per field** — comp_name might use 0.4, overview 0.35

---

## Future Enhancements

- **Ranking** — Combine exact and fuzzy, sort by relevance
- **"Did you mean?"** — Suggest correction when fuzzy returns results (e.g. "Did you mean 'cabin'?")
- **Per-field weights** — comp_name match > overview match
- **Query expansion** — Auto-add common variations ("glamping" → also search "glamp")

---

## Summary

| Approach | Typo tolerance | Effort | Performance | Recommendation |
|----------|----------------|--------|--------------|----------------|
| pg_trgm similarity | ✓ Good | Medium | Good (with indexes) | ✓ Primary |
| Two-phase fallback | ✓ Good | Medium | Good | ✓ Primary |
| Full-text search | ✗ No | Medium | Good | For stemming only |
| Levenshtein | ✓ Good | Medium | Poor | ✗ |
| External search | ✓ Best | High | Best | For scale only |

**Recommended path:** Implement **Option A + D** — use `pg_trgm` similarity in a fallback RPC when exact search returns 0 results.
