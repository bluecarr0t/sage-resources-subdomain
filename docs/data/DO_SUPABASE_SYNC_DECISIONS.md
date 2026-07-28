# DigitalOcean → Supabase Sync — Resolved Decisions

Decisions from Phase 0 open questions (2026-05-25).

## 1. Where do flat `public.hipcamp` / `public.campspot` CSVs come from?

**Decision:** Manual export from a **web UI hosted on / backed by DigitalOcean** (not generated in this repo).

**Implication for automation:**

```
DigitalOcean Postgres (campings)
        │
        ├── Daily scrapes → hipcamp.* / campspot.* (normalized)
        │
        └── Web UI → user clicks Export → CSV download
                              │
                              ▼
                    upload-hipcamp-csv.ts / upload-campspot-csv.ts
                              │
                              ▼
                    Supabase public.hipcamp / public.campspot  ← app uses these today
```

The weekly **mirror sync** (`npm run sync:do`) keeps normalized schemas in sync with DO. The **flat tables** are a separate path until Phase 3 builds an automated transform (or the web UI exposes a schedulable export).

**Phase 3 options (later):**

| Option | Effort | Fidelity to UI export |
|--------|--------|------------------------|
| A. Keep manual UI export + weekly upload script | Low | Exact |
| B. SQL transform from normalized mirror + matviews | High | Must be validated row-by-row vs UI CSV |
| C. API/cron on DO web app to push CSV to Supabase | Medium | Exact if same export code |

---

## 2. Flat tables: full weekly rebuild vs incremental by property?

### Two different layers (do not confuse them)

| Layer | Supabase location | Source | Used by |
|-------|-------------------|--------|---------|
| **Normalized mirror** | `hipcamp.*`, `campspot.*`, `bookoutdoors.*` | DO DB direct read | Future analytics, rate scripts, mirror of warehouse |
| **Flat “sites export”** | `public.hipcamp`, `public.campspot` | UI CSV → upload scripts | Map, Sage AI, `unified_comps`, RV overview |

You approved **incremental sync for the normalized mirror** (question 3). Question 2 is only about the **flat** tables.

### Full weekly rebuild (of flat tables)

**What it means:** Each week, replace the entire contents of `public.hipcamp` and `public.campspot` from a fresh export (CSV from the web UI, or a generated file with the same columns).

**Pros:**

- Matches exactly what analysts see in the DO web UI export.
- No need to reverse-engineer 139-column pivot logic in SQL.
- Simpler mental model: “Supabase flat tables = last week’s export file.”

**Cons:**

- Requires a human (or new UI automation) to run export + upload unless Phase 3 automates it.
- Brief window during upload where data is partial unless you use swap tables (`hipcamp_staging` → rename).
- Does not fix itself if someone forgets the weekly export.

**Fit:** ~57k Hipcamp + ~203k Campspot rows today — full reload is **reasonable weekly** on size.

### Incremental by property (flat tables)

**What it means:** Only update rows that changed since last sync, keyed by something stable (e.g. `property_name` + `site_name` + `state`, or an export `id` column).

**Pros:**

- Faster uploads; can be fully automated if driven from normalized mirror.
- Less disruption for long-running queries on flat tables.

**Cons:**

- The flat CSV may not expose a stable primary key aligned with DO `sites.id` / `scraping_id`.
- UI export logic (aggregations, rate columns by year, dedup) must be replicated exactly in SQL — high risk of drift vs manual export.
- Deletes on DO (removed properties) are hard: incremental often **misses removals** unless you do periodic full reconcile.

**Fit:** Better **after** a validated SQL transform exists and is tested against UI CSV samples.

### Recommendation (given manual UI export today)

| Table set | Strategy | When |
|-----------|----------|------|
| `hipcamp.*`, `campspot.*`, `bookoutdoors.*` | **Incremental** (`updated_at` watermarks) | Now — GitHub Actions weekly |
| `public.hipcamp`, `public.campspot` | **SQL full rebuild** via `npm run transform:flat-sites` | Phase 3 — [PHASE3_FLAT_SITES_TRANSFORM.md](./PHASE3_FLAT_SITES_TRANSFORM.md) |
| `public.hipcamp`, `public.campspot` | **Incremental from mirror** (optional) | Later, after parity testing vs UI CSV |

**Practical short-term weekly ops:**

1. Monday: GitHub Action runs `sync:do` (normalized mirror, incremental, includes large tables after backfill).
2. Same day (or after): `npm run transform:flat-sites` (or enable `flat_transform` on the weekly GitHub Action once validated).
3. `npm run refresh:downstream` — `unified_comps` matview, comps facets cache, RV overview snapshot (see [PHASE4_DOWNSTREAM_REFRESH.md](./PHASE4_DOWNSTREAM_REFRESH.md)).

Legacy fallback: UI CSV + `upload-*-csv.ts` if transform parity is not yet confirmed.

---

## 3. Keep normalized `hipcamp.*` / `campspot.*` in sync?

**Decision (updated Phase 1 condensed):** **Yes for dimensions + analytics snapshots; no for full scrape history.**

Weekly sync pulls:

- Dimension / metadata tables (`scrapings`, `propertydetails`, `sitedetails`, …) with `--no-large`
- Matview snapshots: `latest_sites`, `site_monthly_analytics`, `site_yearly_analytics`

It does **not** grow `hipcamp.sites` / `campspot.sites` / `propertys` history on the weekly cadence. DigitalOcean remains the system of record for raw scrape stacks. Use `npm run sync:do:full` / `--include-large` only as an intentional emergency.

`public.hipcamp` / `public.campspot` remain separate until Phase 3 links or replaces them.

---

## 4. Where to run the weekly job?

**Decision:** **Local launchd (allowlisted IP)**; GitHub Actions `workflow_dispatch` kept for self-hosted/whitelisted runners only.

- Local: `~/Library/LaunchAgents/com.sage.do-supabase-sync.plist` → [`run-local-sync.sh`](../../scripts/sync-do-to-supabase/run-local-sync.sh) (Mondays 09:00 local), always `--databases=campings --no-large` then matviews
- Workflow: [`.github/workflows/weekly-do-sync.yml`](../../.github/workflows/weekly-do-sync.yml) — GH-hosted cron disabled (cannot reach DO Trusted Sources)
- Secrets: `DIGITALOCEAN_DB_PASSWORD`, `SUPABASE_DB_URL`
- Condensed default: **`--no-large`** (do not include large tables on the weekly schedule)

Manual runs: launchd script, or Actions → “Weekly DO to Supabase sync” → `workflow_dispatch` with `include_large` only when needed.

---

## 5. Alerts and observability

**Decision:** **Supabase audit tables only** (no Slack/email in v1)

| Table | Purpose |
|-------|---------|
| `public.do_sync_runs` | Each run: status, options, per-table results JSON, error_message |
| `public.do_sync_watermarks` | Last successful sync time per `campings.{schema}.{table}` |

**Operator checks:**

```sql
SELECT id, started_at, finished_at, status, error_message
FROM public.do_sync_runs
ORDER BY started_at DESC
LIMIT 10;

SELECT source_key, last_synced_at
FROM public.do_sync_watermarks
ORDER BY last_synced_at DESC;
```

Failed GitHub Action runs still appear in the Actions UI; Supabase row is the source of truth for data ops.

---

## Implementation checklist

### Phase 2 — Incremental upsert (done)

- [x] Composite PK detection via `pg_constraint`
- [x] Keyset pagination on `(updated_at, …pk)` — no OFFSET on large incremental pulls
- [x] `INSERT … ON CONFLICT DO UPDATE` for all campings base tables
- [x] `old_data_table` → `--replace-snapshots` (truncate + reload); skipped on weekly default
- [x] 5-minute watermark overlap
- [x] Audit: `do_sync_runs` / `do_sync_watermarks`

### Phase 1 — Condensed weekly (done)

- [x] Default weekly **skips** large tables (`--include-large` / `sync:do:full` emergency only)
- [x] `run-local-sync.sh` bakes `--databases=campings --no-large` + matview snapshots
- [x] Matview snapshots: `latest_sites`, `site_monthly_analytics`, `site_yearly_analytics`
- [x] Legacy `*_public` one-time archive complete (frozen; not weekly)

### CSV migration path (deprecated)

- [x] `migrate:legacy-export` / `migrate:legacy-import` / `migrate:legacy` → blocked; use `sync:do`
- [x] Escape hatch: `migrate:legacy:csv-*` with `ALLOW_LEGACY_CSV_MIGRATION=1`

### Phase 2+ / ops (remaining)

- [ ] Truncate or freeze partial SB `sites`/`propertys` to reclaim disk
- [ ] Wire `transform:flat-sites` into weekly script (preflight today still requires base `sites`)
- [ ] Thin `kpi_*` calculation marts
- [ ] Drop DO legacy `hipcamp` / `campspot` DBs after sign-off
