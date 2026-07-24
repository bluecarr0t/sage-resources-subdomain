# SOA Zaps Inventory

**Generated:** 2026-07-24  
**Source:** Zapier Manager → Find Zap (account `Personal Account` / Sage Outdoor Advisory)  
**Scope note:** Zapier’s Find Zap API does **not** return folder membership. Custom folder-list actions (`list_folder_zaps`) still require a separate Zapier Manager code-action auth bind, so this inventory is the Sage-related Zap set discovered by title search. Confirm which rows live in the **SOA Zaps** folder after that auth completes, then this doc can be narrowed.

**Editors:** Most recent edits by `garwood@sageoutdooradvisory.com` unless noted.

---

## Summary

| Category | Count | On | Off |
| --- | ---: | ---: | ---: |
| GHL pipeline → Slack stage alerts | 11 | 11 | 0 |
| Review / delivery workflow (2026) | 4 | 4 | 0 |
| Review / delivery workflow (2025 / legacy) | 4 | 4 | 0 |
| Job Numbers Google Sheet | 2 | 2 | 0 |
| CRM / contacts / opportunities | 4 | 2 | 2 |
| QB × Slack — Outdoor | 4 | 3 | 1 |
| QB × Slack — Commercial | 4 | 4 | 0 |
| QB × Slack — unlabeled (legacy) | 3 | 3 | 0 |
| Invoice creation / line-item transforms | 4 | 2 | 2 |
| Other forms / intake | 1 | 1 | 0 |
| **Total unique Zaps listed** | **41** | **36** | **5** |

---

## 1. GHL pipeline stage → Slack alerts

**Use case:** When a GoHighLevel opportunity/pipeline stage changes, post an ops Slack message so the team sees delivery and billing milestones in real time.

**Pattern (inferred):** Trigger = LeadConnector / GHL stage or opportunity update → Filter for specific stage → Slack channel message.

| Status | Zap | ID | Last live | Editor | Links |
| --- | --- | ---: | --- | --- | --- |
| ON | GHL — Contract Signed: Slack Message | 347167980 | 2026-02-03 | garwood@… | [Editor](https://zapier.com/editor/347167980) · [History](https://zapier.com/app/history?root_id=347167980) |
| ON | GHL — 1st Payment Invoice Sent: Slack Message | 347169162 | 2026-02-03 | garwood@… | [Editor](https://zapier.com/editor/347169162) · [History](https://zapier.com/app/history?root_id=347169162) |
| ON | GHL — 1st Payment Invoice Paid: Slack Message | 347172670 | 2026-02-03 | garwood@… | [Editor](https://zapier.com/editor/347172670) · [History](https://zapier.com/app/history?root_id=347172670) |
| ON | GHL — Assign Author/Schedule Onboarding Call/Create Job Folder: Slack Message | 347170098 | 2026-02-03 | garwood@… | [Editor](https://zapier.com/editor/347170098) · [History](https://zapier.com/app/history?root_id=347170098) |
| ON | GHL — Kick Off Call Scheduled: Slack Message | 347170465 | 2026-02-03 | garwood@… | [Editor](https://zapier.com/editor/347170465) · [History](https://zapier.com/app/history?root_id=347170465) |
| ON | GHL — Report In Process: Slack Message | 347170817 | 2026-02-03 | garwood@… | [Editor](https://zapier.com/editor/347170817) · [History](https://zapier.com/app/history?root_id=347170817) |
| ON | GHL — Mid Project Client Call: Slack Message | 347171141 | 2026-02-03 | garwood@… | [Editor](https://zapier.com/editor/347171141) · [History](https://zapier.com/app/history?root_id=347171141) |
| ON | GHL — Review-Final Approval: Slack Message | 347171265 | 2026-02-03 | garwood@… | [Editor](https://zapier.com/editor/347171265) · [History](https://zapier.com/app/history?root_id=347171265) |
| ON | GHL — Report Sent to Client: Slack Message | 347172090 | 2026-02-03 | garwood@… | [Editor](https://zapier.com/editor/347172090) · [History](https://zapier.com/app/history?root_id=347172090) |
| ON | GHL — 2nd Payment Invoice Sent: Slack Message | 347172202 | 2026-02-03 | garwood@… | [Editor](https://zapier.com/editor/347172202) · [History](https://zapier.com/app/history?root_id=347172202) |
| ON | GHL — 2nd Payment Invoice Paid: Slack Message | 347172461 | 2026-02-03 | garwood@… | [Editor](https://zapier.com/editor/347172461) · [History](https://zapier.com/app/history?root_id=347172461) |

**Typical pipeline order (from titles):** Contract Signed → 1st Invoice Sent → 1st Invoice Paid → Assign Author / Onboarding / Job Folder → Kick Off Call → Report In Process → Mid Project Call → Review-Final Approval → Report Sent → 2nd Invoice Sent → 2nd Invoice Paid.

---

## 2. Review / delivery workflow (2026)

**Use case:** Internal report review → Slack → sheet status → GHL, then emoji confirmation marks “sent to client,” and completed reports land on a project list sheet.

| Status | Zap | ID | Last live | Links |
| --- | --- | ---: | --- | --- |
| ON | [2026] Zap 1 — Google Form Review Submitted to Slack | 342057735 | 2026-01-06 | [Editor](https://zapier.com/editor/342057735) · [History](https://zapier.com/app/history?root_id=342057735) |
| ON | [2026] Zap 2 — Sheet Status Change → Slack + GoHighLevel | 342058716 | 2026-01-13 | [Editor](https://zapier.com/editor/342058716) · [History](https://zapier.com/app/history?root_id=342058716) |
| ON | [2026] Zap 3 — Slack Emoji → Sent to Client + GoHighLevel | 342059565 | 2026-01-06 | [Editor](https://zapier.com/editor/342059565) · [History](https://zapier.com/app/history?root_id=342059565) |
| ON | [2026] Completed Report - Add to Project List Google Sheet | 342065306 | 2026-01-06 | [Editor](https://zapier.com/editor/342065306) · [History](https://zapier.com/app/history?root_id=342065306) |

**Inferred flow:** Google Form (review submitted) → Slack → Sheet status update syncs Slack + GHL → Slack emoji reaction updates GHL “sent to client” → completed report row added to project list sheet.

---

## 3. Review / delivery workflow (2025 / legacy counterparts)

**Use case:** Same pattern as 2026, prior-year copies still **ON** (possible overlap / dual-running risk).

| Status | Zap | ID | Last live | Links |
| --- | --- | ---: | --- | --- |
| ON | [2025] Zap 1 — Google Form Review Submitted to Slack | 314301001 | 2026-02-13 | [Editor](https://zapier.com/editor/314301001) · [History](https://zapier.com/app/history?root_id=314301001) |
| ON | [2025] Zap 2 — Sheet Status Change → Slack + GoHighLevel | 319338083 | 2026-01-13 | [Editor](https://zapier.com/editor/319338083) · [History](https://zapier.com/app/history?root_id=319338083) |
| ON | [2025] Zap 3 — Slack Emoji → Sent to Client + GoHighLevel | 319386831 | 2026-01-13 | [Editor](https://zapier.com/editor/319386831) · [History](https://zapier.com/app/history?root_id=319386831) |
| ON | Completed Report - Add to Project List Google Sheet | 270264459 | 2025-11-03 | [Editor](https://zapier.com/editor/270264459) · [History](https://zapier.com/app/history?root_id=270264459) |

**Review note:** If 2026 Zaps 1–3 fully replaced 2025, consider turning 2025 copies off to avoid duplicate Slack/GHL updates.

---

## 4. Job Numbers Google Sheet

**Use case:** Keep the job-numbers / assign-work spreadsheet current when new jobs appear and when due/onboarding dates are set.

| Status | Zap | ID | Last live | Links |
| --- | --- | ---: | --- | --- |
| ON | [2026] Job Numbers Google Sheet - Add New Job to Assign Work | 271465889 | 2026-01-06 | [Editor](https://zapier.com/editor/271465889) · [History](https://zapier.com/app/history?root_id=271465889) |
| ON | [2026] Job Numbers Google Sheet - Add `Due Date` and `Onboarding Date` | 351008011 | 2026-05-06 | [Editor](https://zapier.com/editor/351008011) · [History](https://zapier.com/app/history?root_id=351008011) |

---

## 5. CRM / contacts / opportunities

**Use case:** Sync marketing/site contacts and sales activity into GoHighLevel; legacy commerce sync.

| Status | Zap | ID | Last live | Notes | Links |
| --- | --- | ---: | --- | --- | --- |
| ON | Resources (Subdomain) to GHL Contacts | 367494727 | 2026-06-05 | Likely webhook/form from resources subdomain → GHL contact | [Editor](https://zapier.com/editor/367494727) · [History](https://zapier.com/app/history?root_id=367494727) |
| OFF | Sales - Meeting Notes to GHL Opportunity | 369880308 | — | Paused; meeting notes → opportunity | [Editor](https://zapier.com/editor/369880308) · [History](https://zapier.com/app/history?root_id=369880308) |
| OFF | Woocommerce to GoHighLevel | 325692736 | — | Paused commerce → CRM | [Editor](https://zapier.com/editor/325692736) · [History](https://zapier.com/app/history?root_id=325692736) |
| ON | SOA Engagement Letter Contact Update | 208094966 | 2023-09-19 | Older; engagement letter → contact update | [Editor](https://zapier.com/editor/208094966) · [History](https://zapier.com/app/history?root_id=208094966) |

---

## 6. QuickBooks × Slack — Outdoor

**Use case:** Notify Slack when Outdoor entity invoices are created, partially paid, fully paid, or overdue.

| Status | Zap | ID | Last live | Last paused | Links |
| --- | --- | ---: | --- | --- | --- |
| ON | QB x Slack: New Invoice [OUTDOOR] | 326989764 | 2025-11-07 | 2025-11-07 | [Editor](https://zapier.com/editor/326989764) · [History](https://zapier.com/app/history?root_id=326989764) |
| ON | QB x Slack: Payment 1 of 2 [OUTDOOR] | 326990616 | 2025-10-14 | — | [Editor](https://zapier.com/editor/326990616) · [History](https://zapier.com/app/history?root_id=326990616) |
| ON | QB x Slack: Invoice Fully Paid [OUTDOOR] | 326988417 | 2025-10-14 | — | [Editor](https://zapier.com/editor/326988417) · [History](https://zapier.com/app/history?root_id=326988417) |
| OFF | QB x Slack: Invoice 30, 60, and 90 Days Overdue [OUTDOOR] | 326991093 | 2026-03-26 | 2026-04-22 | [Editor](https://zapier.com/editor/326991093) · [History](https://zapier.com/app/history?root_id=326991093) |

---

## 7. QuickBooks × Slack — Commercial

**Use case:** Same billing alerts for the Commercial entity.

| Status | Zap | ID | Last live | Links |
| --- | --- | ---: | --- | --- |
| ON | QB x Slack: New Invoice [COMMERCIAL] | 326995312 | 2025-11-07 | [Editor](https://zapier.com/editor/326995312) · [History](https://zapier.com/app/history?root_id=326995312) |
| ON | QB x Slack: Payment 1 of 2 [COMMERCIAL] | 326994772 | 2025-10-14 | [Editor](https://zapier.com/editor/326994772) · [History](https://zapier.com/app/history?root_id=326994772) |
| ON | QB x Slack: Invoice Fully Paid [COMMERCIAL] | 326994386 | 2025-10-14 | [Editor](https://zapier.com/editor/326994386) · [History](https://zapier.com/app/history?root_id=326994386) |
| ON | QB x Slack: Invoice 30, 60, and 90 Days Overdue [COMMERICAL] | 332143880 | 2026-03-26 | [Editor](https://zapier.com/editor/332143880) · [History](https://zapier.com/app/history?root_id=332143880) |

**Note:** Title typo `COMMERICAL` (missing “C”) on the overdue Zap.

---

## 8. QuickBooks × Slack — unlabeled (legacy)

**Use case:** Earlier QB→Slack billing alerts without Outdoor/Commercial suffix — may overlap with entity-specific Zaps.

| Status | Zap | ID | Last live | Links |
| --- | --- | ---: | --- | --- |
| ON | QB x Slack: New Invoice | 304386740 | 2025-10-15 | [Editor](https://zapier.com/editor/304386740) · [History](https://zapier.com/app/history?root_id=304386740) |
| ON | QB x Slack: Payment 1 of 2 | 304393869 | 2025-11-07 | [Editor](https://zapier.com/editor/304393869) · [History](https://zapier.com/app/history?root_id=304393869) |
| ON | QB x Slack: Invoice Fully Paid | 304389944 | 2025-08-22 | [Editor](https://zapier.com/editor/304389944) · [History](https://zapier.com/app/history?root_id=304389944) |

**Review note:** Likely candidates to pause if Outdoor/Commercial Zaps fully replaced them.

---

## 9. Invoice creation / line-item transforms

**Use case:** Create QB invoices from Google Forms / commercial appraisal intake; optional line-item rename.

| Status | Zap | ID | Last live | Last paused | Links |
| --- | --- | ---: | --- | --- | --- |
| ON | Invoice: Google Forms to QB | 326088900 | 2025-11-03 | — | [Editor](https://zapier.com/editor/326088900) · [History](https://zapier.com/app/history?root_id=326088900) |
| OFF | Invoice: Google Forms to QB (Split Version) | 333684348 | — | — | [Editor](https://zapier.com/editor/333684348) · [History](https://zapier.com/app/history?root_id=333684348) |
| ON | Commercial - Appraisal Client Invoices | 342467406 | 2026-01-13 | — | [Editor](https://zapier.com/editor/342467406) · [History](https://zapier.com/app/history?root_id=342467406) |
| OFF | QB Invoice Line Item "Appraisal Review" to "Feasibility Study" | 355873296 | 2026-04-23 | 2026-07-20 | [Editor](https://zapier.com/editor/355873296) · [History](https://zapier.com/app/history?root_id=355873296) |

---

## 10. Other intake

| Status | Zap | ID | Last live | Use case (inferred) | Links |
| --- | --- | ---: | --- | --- | --- |
| ON | Client Data Form Filled Out | 210531750 | 2023-10-10 | Client data form submission handling | [Editor](https://zapier.com/editor/210531750) · [History](https://zapier.com/app/history?root_id=210531750) |

---

## Limitations / next pass

1. **Folder membership** not confirmed for **SOA Zaps** until `list_folder_zaps` auth works.  
   Complete this URL while logged into Zapier as Kristin (same session as mcp.zapier.com):  
   https://mcp.zapier.com/mcp/servers/4285cd2a-0236-4564-b0ff-8326013153a7/app-auth/ZapierManagerCLIAPI
2. **Step-level apps/filters/fields** are not returned by Find Zap — open each editor link for exact triggers, filters, and field mappings.
3. **2025 vs 2026 review Zaps** and **legacy unlabeled QB Slack Zaps** may be duplicate coverage worth pruning.

After folder auth succeeds, re-run folder list and replace this inventory with a folder-exact version including step summaries.
