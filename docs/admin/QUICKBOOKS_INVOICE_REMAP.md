# QuickBooks INV- invoice remapper

Short overview of how GHL → QuickBooks invoices are corrected automatically.

## How invoices get into QuickBooks

1. GoHighLevel (GHL) creates or syncs an invoice into QuickBooks Online.
2. Those invoices use DocNumbers that start with **`INV-`** (e.g. `INV-25-109A-01`).
3. GHL often assigns the product/service **Appraisal Review** on line items, even when the work is a feasibility study or an appraisal add-on.
4. This app remaps those **invoice line** Product/Service values in QBO. Catalog items themselves are not renamed.

Only invoices whose number starts with `INV-` are in scope. Other invoices are left alone.

## Remap rules (first match wins per line)

| When (on an `INV-` invoice line) | Product/Service becomes | What stays the same |
| --- | --- | --- |
| Description **contains** `Appraisal` (case-insensitive) | **Appraisal Services - Outdoor Resort** | Description, qty, rate, amount |
| Product/Service (or description) is exactly **Appraisal Review** | **Feasibility Study - Outdoor Resort** | Description when it is not exactly `Appraisal Review`; qty, rate, amount |

### Practical guidance for GHL / billing

- Put **`Appraisal`** in the line **description** when the line should land on appraisal services — for example `Valuation Analysis / Appraisal` or `Appraisal Addendum`. That line is auto-mapped to **Appraisal Services - Outdoor Resort**.
- Leave feasibility / other work descriptions without the word `Appraisal` (e.g. `Feasibility Study`, `Site Visit`). If GHL still sets the product to **Appraisal Review**, the remapper moves that line to **Feasibility Study - Outdoor Resort**.
- Description text is preserved for the Appraisal-in-description rule, so customers still see the wording you entered in GHL.

## When remapping runs

| Trigger | What it does |
| --- | --- |
| **Every 15 minutes** (`/api/cron/quickbooks-remap-invoices`) | Scans invoices updated in the last ~2 hours (catches fresh GHL syncs) |
| **Daily** (`/api/cron/quickbooks-remap-invoices-daily`, 14:00 UTC) | Full scan of invoices so nothing is missed |
| **Intuit webhook** (`/api/webhooks/quickbooks`) | Remaps on invoice create/update when webhooks are configured |
| **Admin UI** (`/admin/quickbooks`) | Manual dry-run or live remap |
| **CLI** (`scripts/quickbooks-remap-invoices.ts`) | `--dry-run` / `--live`, optional `--doc-number=INV-…` |

History of remaps is stored and visible on the admin QuickBooks page.

## Examples

| Description | Product before (typical GHL) | Product after |
| --- | --- | --- |
| `Feasibility Study` | Appraisal Review | Feasibility Study - Outdoor Resort |
| `Valuation Analysis / Appraisal` | Appraisal Review (or anything else) | Appraisal Services - Outdoor Resort |
| `Appraisal Addendum` | (any) | Appraisal Services - Outdoor Resort |
| `Site Visit` | Appraisal Review | Feasibility Study - Outdoor Resort |

## Safety guards

- **Skip voided / zeroed invoices** — if `PrivateNote` contains `Voided`, or every sales line is already `$0`, the remapper does nothing.
- **Preserve money fields** — when changing Product/Service, the update payload explicitly keeps each line’s Amount, Qty, and UnitPrice (deriving rate from amount/qty when needed) and strips noisy read-only fields.
- **Preserve tax detail** — when an invoice has `TxnTaxDetail` / `TaxLine`, the sparse update sends the existing tax code, `TotalTax`, and `TaxLine` values unchanged so Audit History does not rewrite tax components.
- **TotalAmt / tax check** — after a live update, if `TotalAmt` or `TxnTaxDetail.TaxLine` changed, the run is recorded as a safety-check error.

## Ops notes

- Requires QuickBooks OAuth connected for the production company (Admin → QuickBooks).
- Env: `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_ENVIRONMENT=production`, optional webhook verifier.
- Rule constants live in `lib/quickbooks/constants.ts` and `lib/quickbooks/remap-rules.ts`.
