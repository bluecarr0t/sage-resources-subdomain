# Comparables Search Functionality — Review

Review of the search implementation on `/admin/comparables` (client + API).

---

## Current Architecture

| Layer | Implementation |
|-------|----------------|
| **Client** | Single text input, 300ms debounce, state in React (`search`, `sortBy`, `sortDir`, `page`) |
| **API** | `GET /api/admin/comparables?search=...&sort_by=...&sort_dir=...&page=...` |
| **Backend** | Fetches up to 5,000 rows, then filters in-memory when `search`, `unit_category`, or ADR filters are used |

---

## Issues

### 1. **Search not reflected in URL**
- Search, sort, and page live only in React state.
- Refreshing or sharing the page loses the current search.
- `?expand=` and `?page=` are read from the URL, but `search`, `sort_by`, `sort_dir` are not.

### 2. **No initial hydration from URL**
- `search` is always initialized as `''`.
- No support for `?search=...` on load.

### 3. **All terms must match (AND)**
- Query `"spa texas"` requires both "spa" and "texas" in the same comparable.
- No OR option or phrase search.

### 4. **Grouped comparables: only primary report used for location**
- For grouped comparables, search uses `reports[0]` (primary report).
- If a property appears in multiple states, searching for the non-primary state may not find it.
- **Note:** Filtering happens before grouping on raw rows, so each row is evaluated with its own report. This is correct. The above concern applies only if the same comp appears in multiple reports with different locations—all rows are still evaluated, so it should work.

### 5. **Performance: fetch-then-filter**
- API fetches up to 5,000 rows, then filters in Node.
- With many comparables, this will not scale.
- No database-level full-text search or indexes for `comp_name`, `overview`, etc.

### 6. **No loading indicator during debounce**
- User types, waits 300ms, then a request starts.
- No feedback that search is pending.

### 7. **"Clear" only on empty state**
- The Clear button appears only when there are no results.
- No way to clear search when results exist without manually deleting text.

### 8. **Job number not searchable**
- API does not search `study_id` / job number.
- Placeholder mentions "property, city, state, country, unit type, keywords" but not job number.

### 9. **Country search**
- Placeholder mentions "country", and API includes `reportsObj?.country` in searchable text.
- Behavior is correct if `reports.country` is populated.

---

## Improvements

### Quick wins

1. **Sync search/sort/page to URL**  
   Use `router.replace` with `?search=...&sort_by=...&sort_dir=...&page=...` so state is shareable and survives refresh.

2. **Hydrate from URL on load**  
   Initialize `search`, `sortBy`, `sortDir`, `page` from `searchParams` when the component mounts.

3. **Add a clear (X) button in the search input**  
   Show when `search` is non-empty so users can clear without emptying the field manually.

4. **Add job number to search**  
   Include `study_id` from reports in the API’s searchable fields.

5. **Search result count feedback**  
   Show something like "Showing X of Y comparables" when a search is active.

### Medium effort

6. **OR vs AND toggle**  
   Let users choose "Match all terms" vs "Match any term".

7. **Phrase search**  
   Support quoted strings for exact phrases.

8. **Search in URL**  
   Ensure `?search=` is in the URL and used for initial load and sharing.

9. **Loading state during debounce**  
   Show a subtle "Searching..." or spinner while debounced search is pending.

### Larger changes

10. **Database-level search**  
    Use Postgres full-text search (`tsvector`/`tsquery`) or `ilike` with indexes instead of in-memory filtering.

11. **Expose advanced filters in the UI**  
    API already supports `state`, `unit_category`, `min_adr`, `max_adr`; add dropdowns/sliders in the UI.

---

## Future Features

1. **Saved searches**  
   Allow users to save and reuse common queries.

2. **Recent searches**  
   Show recent search terms in a dropdown for quick reuse.

3. **Search suggestions / autocomplete**  
   Suggest property names, cities, states, or unit types as the user types.

4. **Highlight matches**  
   Highlight matched terms in the table (e.g., property name, keywords).

5. **Export filtered results**  
   Export Excel only for the current filtered/search result set (verify current behavior).

6. **Faceted search**  
   Show counts per state, unit category, etc., and allow filtering by clicking facets.

7. **Fuzzy / typo tolerance**  
   Use trigram similarity or full-text search to handle typos.

8. **Search analytics**  
   Track popular searches to improve relevance and UX.

---

## API Parameters (Supported but Not Exposed in UI)

| Param | Type | Description |
|-------|------|--------------|
| `state` | string | Filter by report state (e.g. `TX`, `CA`) |
| `unit_category` | string | Filter by unit category (e.g. `cabin`, `rv_site`) |
| `min_adr` | number | Minimum ADR |
| `max_adr` | number | Maximum ADR |

These could be added as filter controls to narrow results without relying solely on text search.

---

## Summary

| Category | Count |
|----------|-------|
| Issues | 9 |
| Quick-win improvements | 5 |
| Medium improvements | 4 |
| Larger changes | 2 |
| Future features | 8 |

**Top priorities:** URL sync + hydration, clear button in search input, and database-level search for scalability.
