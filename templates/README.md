# Report templates (foundation rebase)

These files are the live Feasibility Study templates used by AI Report Builder.

| Market | File | Source | Rebased |
|---|---|---|---|
| Glamping | `glamping/template.xlsx` | `GLAMPING TEMPLATE 3-12-26.xlsx` | 2026-08-06 |
| Glamping | `glamping/template.docx` | `GLAMPING FS TEMPLATE 10-25-25 (1).docx` | 2026-08-06 |
| RV | `rv/template.xlsx` | `RV FS TEMPLATE 06-24-26.xlsm` (macros stripped → `.xlsx`) | 2026-08-06 |
| RV | `rv/template.docx` | `RV FS TEMPLATE 06-24-26.doc` (LibreOffice → `.docx`) | 2026-08-06 |

Upload to Supabase after changes:

```bash
npx tsx scripts/upload-report-templates.ts
```

Assemblers load from Supabase `report-templates/{rv|glamping}/template.{docx,xlsx}` with local fallback under this directory.
