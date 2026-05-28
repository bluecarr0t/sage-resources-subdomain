# Sauna web research runbook

Inventory-weighted ARDR driver analysis for saunas uses explicit `unit_sauna` / `property_sauna` tags on [`all_glamping_properties`](../../queries/ardr_drivers_post.sql) (section **4b**).

## Prerequisites

- `.env.local`: `FIRECRAWL_API_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `SAUNA_RESEARCH_MODEL` (defaults to `gpt-4o`)
- **Firecrawl credits** must be available; exhausted credits return `fetch_error` on every property (check balance at [firecrawl.dev](https://firecrawl.dev/pricing))

### Post-backfill (2026-05-27)

- **17.4%** of rated inventory has explicit `unit_sauna` Yes/No (was 1.5%)
- **2** units with private sauna (`Yes`) — premium sample still too thin for LinkedIn
- See [`SAUNA_ARDR_REMEASURE-2026-05-27.md`](./SAUNA_ARDR_REMEASURE-2026-05-27.md)

## Phase 0 — Audit

Run [`queries/sauna_tagging_audit.sql`](../../queries/sauna_tagging_audit.sql) in Supabase SQL editor.

Record baseline: % null `unit_sauna` / `property_sauna`, URL coverage, `units_unit_sauna_yes`.

## Phase 1 — Pilot (25 properties)

```bash
npx tsx scripts/research-sauna-glamping.ts --dry-run --limit 25 --only-null --export-sql
# Review scripts/.tmp-sauna-review/results.jsonl

npx tsx scripts/research-sauna-glamping.ts --limit 25 --only-null --export-sql
```

Spot-check 5 live sites. Confirm communal vs private sauna tagging.

## Phase 2 — Batch backfill

```bash
npx tsx scripts/research-sauna-glamping.ts --limit 200 --only-null --export-sql
```

Artifacts: `scripts/.tmp-sauna-review/` (`results.jsonl`, `conflicts.csv`, `backfill-sauna-YYYY-MM-DD.sql`).

Copy approved SQL to `scripts/migrations/backfill-sauna-web-research-YYYY-MM-DD.sql` if applying via migration.

## Apply policy

| Situation | Action |
|-----------|--------|
| Target field null/empty, confidence high (or medium + evidence) | Auto-apply |
| Existing Yes/No disagrees with research | Log to `conflicts.csv`; do not overwrite |
| Unmatched site row | Review queue |
| `unit_sauna = Yes` and `unit_hot_tub_or_sauna` empty | Set combined flag to Yes |

Discovery source tag: `web_research_sauna_YYYY_MM_DD`.

## Phase 5 — Re-measure ARDR

Run section **4b** in [`queries/ardr_drivers_post.sql`](../../queries/ardr_drivers_post.sql).

### Publish gates (sauna premium copy)

| Gate | Target |
|------|--------|
| Minimum n (units with private sauna) | ≥ 30 |
| Stretch n | ≥ 500 |
| Explicit tagging share | ≥ 15% of rated inventory |

Until gates pass, use caveat: *“Among properties where sauna is documented in our inventory…”*

## CLI reference

| Flag | Effect |
|------|--------|
| `--dry-run` | No DB writes |
| `--limit N` | Max properties |
| `--only-null` | Rows where both sauna fields empty |
| `--property-id UUID` | Single property |
| `--export-sql` | Write UPDATE statements |
| `--include-researched` | Include rows already tagged via discovery_source |
| `--report` | Print audit paths |

## Related

- Hot tub pipeline: [`HOT_TUB_RESEARCH_RUNBOOK.md`](./HOT_TUB_RESEARCH_RUNBOOK.md)
- Shared scrape helper: [`lib/glamping-hot-tub-research/scrape.ts`](../../lib/glamping-hot-tub-research/scrape.ts)
