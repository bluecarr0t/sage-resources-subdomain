# GoHighLevel Workflows / Automations Inventory

**Generated:** 2026-07-24  
**Location:** Sage Outdoor Advisory (`JCHQyFysCX49WT31jkM1`)  
**Source:** `GET https://services.leadconnectorhq.com/workflows/?locationId=…` via Private Integration Token  
**Separate from:** Zapier inventory (`docs/zapier/SOA-ZAPS-INVENTORY.md`)

---

## Summary

| Metric | Count |
| --- | ---: |
| Total workflows | 37 |
| Active (`published`) | 32 |
| Inactive (`draft`) | 5 |
| Categories (inferred) | 9 |

| Category | Count | Active | Inactive |
| --- | ---: | ---: | ---: |
| Appointment confirmations & reminders | 5 | 4 | 1 |
| Client data forms | 2 | 2 | 0 |
| Contract lifecycle | 7 | 6 | 1 |
| Event / lead-magnet email automations | 10 | 10 | 0 |
| Google Contacts sync | 2 | 2 | 0 |
| Invoice & payment lifecycle | 7 | 6 | 1 |
| Newsletter / marketing tags | 1 | 1 | 0 |
| Project completion | 2 | 1 | 1 |
| Review / report delivery | 1 | 0 | 1 |

---

## API limitations

GHL’s public Workflows API is **read-only list metadata**. For each workflow it returns:

- `id`, `name`, `status` (`published` | `draft`), `version`, `createdAt`, `updatedAt`, `locationId`

It does **not** expose:

- Long-form descriptions
- Trigger / condition / action step graphs
- Enrollment stats or run history
- Campaigns (legacy) — this location returned an empty campaigns list

In this doc:

- **Active** = `status: published`
- **Inactive** = `status: draft`
- **Use cases** are inferred from workflow titles (not stored in GHL API fields)
- Open a workflow in GHL UI for exact triggers/actions: Automation → Workflows

Raw exports:

- [`workflows-raw-2026-07-24.json`](./workflows-raw-2026-07-24.json)
- [`workflows-enriched-2026-07-24.json`](./workflows-enriched-2026-07-24.json)

---

## Relationship to Zapier SOA Zaps

Several GHL workflows cover the **same business milestones** that Zapier Slack alerts also notify on (contract signed, invoices, payments, report sent). Rough pairing:

| GHL workflow theme | Related Zapier theme |
| --- | --- |
| Contract — Signed / follow-ups | GHL — Contract Signed: Slack Message |
| Invoice — 1st/2nd sent & paid | GHL — *Invoice* Slack Message Zaps |
| Data Form — Submitted / Follow Up | Client Data Form / Job Numbers flows |
| Review Process: Move Opportunity to 'Report Sent to Client' | GHL — Report Sent + review Zaps 1–3 |

GHL workflows typically **mutate CRM state / send client emails**; many Zapier Zaps **fan out Slack notifications** from those stage changes.

---

## Appointment confirmations & reminders

**Use case (category):** Send confirmation and reminder messages when a calendar appointment is booked.

| Status | Workflow | Version | Created | Updated | ID |
| --- | --- | ---: | --- | --- | --- |
| Active | Sales – Onboarding Call - Appointment Confirmation + Reminder | 6 | 2025-12-17 | 2026-01-26 | `014313ba-4ed2-44ee-9567-debcbdbad15e` |
| Active | Sales — Intro Call - Appointment Confirmation + Reminder | 36 | 2023-07-28 | 2026-02-19 | `ea3bcf31-fe9c-491e-82a3-96bcfde0f549` |
| Active | Sales — Kristin 1-on-1 Call - Appointment Confirmation + Reminder | 8 | 2023-09-13 | 2026-02-19 | `92ae578b-bec2-4362-bf67-04c7970eaa7e` |
| Active | Sales — Shari Consulting Call - Appointment Confirmation + Reminder | 10 | 2023-08-25 | 2026-02-19 | `85c604a1-740e-498d-9a5c-0da4e7830c60` |
| Inactive | (1) Onboarding Call - Appointment Confirmation + Reminder | 4 | 2025-06-06 | 2025-12-12 | `dfc773f3-5eaa-4885-b722-1c6a525b7e53` |

### Details

#### Sales – Onboarding Call - Appointment Confirmation + Reminder

- **Status:** Active (published)
- **Use case:** Send confirmation and reminder messages when a calendar appointment is booked.
- **Version:** 6
- **Created:** 2025-12-17T20:41:28.611Z
- **Updated:** 2026-01-26T19:10:50.354Z
- **Workflow ID:** `014313ba-4ed2-44ee-9567-debcbdbad15e`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Sales — Intro Call - Appointment Confirmation + Reminder

- **Status:** Active (published)
- **Use case:** Send confirmation and reminder messages when a calendar appointment is booked.
- **Version:** 36
- **Created:** 2023-07-28T20:08:12.274Z
- **Updated:** 2026-02-19T18:08:42.947Z
- **Workflow ID:** `ea3bcf31-fe9c-491e-82a3-96bcfde0f549`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Sales — Kristin 1-on-1 Call - Appointment Confirmation + Reminder

- **Status:** Active (published)
- **Use case:** Send confirmation and reminder messages when a calendar appointment is booked.
- **Version:** 8
- **Created:** 2023-09-13T19:24:45.010Z
- **Updated:** 2026-02-19T18:08:50.000Z
- **Workflow ID:** `92ae578b-bec2-4362-bf67-04c7970eaa7e`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Sales — Shari Consulting Call - Appointment Confirmation + Reminder

- **Status:** Active (published)
- **Use case:** Send confirmation and reminder messages when a calendar appointment is booked.
- **Version:** 10
- **Created:** 2023-08-25T22:30:45.994Z
- **Updated:** 2026-02-19T18:08:57.383Z
- **Workflow ID:** `85c604a1-740e-498d-9a5c-0da4e7830c60`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### (1) Onboarding Call - Appointment Confirmation + Reminder

- **Status:** Inactive (draft)
- **Use case:** Send confirmation and reminder messages when a calendar appointment is booked.
- **Version:** 4
- **Created:** 2025-06-06T16:08:21.085Z
- **Updated:** 2025-12-12T22:27:07.847Z
- **Workflow ID:** `dfc773f3-5eaa-4885-b722-1c6a525b7e53`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

---

## Client data forms

**Use case (category):** Handle client data form submission and follow-up nudges.

| Status | Workflow | Version | Created | Updated | ID |
| --- | --- | ---: | --- | --- | --- |
| Active | Data Form — Submitted | 32 | 2023-09-19 | 2026-03-09 | `7ff92da8-ae0e-46eb-a780-a34faac62e62` |
| Active | Follow Up Client Data Form | 11 | 2025-05-14 | 2026-02-19 | `41c1a8da-a5d5-47ea-a18c-fc062db67ddd` |

### Details

#### Data Form — Submitted

- **Status:** Active (published)
- **Use case:** Handle client data form submission and follow-up nudges.
- **Version:** 32
- **Created:** 2023-09-19T14:54:48.490Z
- **Updated:** 2026-03-09T17:31:12.907Z
- **Workflow ID:** `7ff92da8-ae0e-46eb-a780-a34faac62e62`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Follow Up Client Data Form

- **Status:** Active (published)
- **Use case:** Handle client data form submission and follow-up nudges.
- **Version:** 11
- **Created:** 2025-05-14T17:05:00.622Z
- **Updated:** 2026-02-19T18:08:15.021Z
- **Workflow ID:** `41c1a8da-a5d5-47ea-a18c-fc062db67ddd`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

---

## Contract lifecycle

**Use case (category):** Automate contract follow-ups, signature handling, and opportunity/contact updates.

| Status | Workflow | Version | Created | Updated | ID |
| --- | --- | ---: | --- | --- | --- |
| Active | Contract Signed - Referral Email Reminder | 6 | 2026-02-19 | 2026-02-19 | `83d5e877-a22e-4dc5-a96d-ab7268f4a76e` |
| Active | Contract – Initial Info 1 YR Follow up If not Signed | 3 | 2025-07-10 | 2025-07-10 | `da67adb4-5495-47b3-acea-ebf81768c6f0` |
| Active | Contract – Response from FU and send 2nd FU | 4 | 2025-07-10 | 2026-07-08 | `1eb16ce0-4439-4731-bbe4-45a46798088a` |
| Active | Contract — Follow up If not Signed | 21 | 2024-02-21 | 2026-06-24 | `c9658794-2978-4ff1-ad07-3db845668b2a` |
| Active | Contract — Initial Info LT Follow up If not Signed | 3 | 2024-12-04 | 2026-02-19 | `e9f26738-b64c-48ff-9cfa-1ef4f74a9379` |
| Active | Contract — Signed - Update Opportunity & Contact | 14 | 2024-12-03 | 2026-02-20 | `bdb2002c-3056-47ef-ad8c-aa916e295a56` |
| Inactive | Contract — Signed - Confirmation Email | 23 | 2024-07-05 | 2026-02-19 | `344d4a93-35d4-40ee-8d15-4ccb311b31de` |

### Details

#### Contract Signed - Referral Email Reminder

- **Status:** Active (published)
- **Use case:** Automate contract follow-ups, signature handling, and opportunity/contact updates.
- **Version:** 6
- **Created:** 2026-02-19T17:56:54.770Z
- **Updated:** 2026-02-19T18:06:50.407Z
- **Workflow ID:** `83d5e877-a22e-4dc5-a96d-ab7268f4a76e`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Contract – Initial Info 1 YR Follow up If not Signed

- **Status:** Active (published)
- **Use case:** Automate contract follow-ups, signature handling, and opportunity/contact updates.
- **Version:** 3
- **Created:** 2025-07-10T18:28:17.153Z
- **Updated:** 2025-07-10T20:45:01.802Z
- **Workflow ID:** `da67adb4-5495-47b3-acea-ebf81768c6f0`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Contract – Response from FU and send 2nd FU

- **Status:** Active (published)
- **Use case:** Automate contract follow-ups, signature handling, and opportunity/contact updates.
- **Version:** 4
- **Created:** 2025-07-10T18:43:43.345Z
- **Updated:** 2026-07-08T16:42:55.389Z
- **Workflow ID:** `1eb16ce0-4439-4731-bbe4-45a46798088a`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Contract — Follow up If not Signed

- **Status:** Active (published)
- **Use case:** Automate contract follow-ups, signature handling, and opportunity/contact updates.
- **Version:** 21
- **Created:** 2024-02-21T17:31:20.335Z
- **Updated:** 2026-06-24T20:04:38.871Z
- **Workflow ID:** `c9658794-2978-4ff1-ad07-3db845668b2a`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Contract — Initial Info LT Follow up If not Signed

- **Status:** Active (published)
- **Use case:** Automate contract follow-ups, signature handling, and opportunity/contact updates.
- **Version:** 3
- **Created:** 2024-12-04T19:06:16.277Z
- **Updated:** 2026-02-19T18:07:21.203Z
- **Workflow ID:** `e9f26738-b64c-48ff-9cfa-1ef4f74a9379`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Contract — Signed - Update Opportunity & Contact

- **Status:** Active (published)
- **Use case:** Automate contract follow-ups, signature handling, and opportunity/contact updates.
- **Version:** 14
- **Created:** 2024-12-03T21:00:52.411Z
- **Updated:** 2026-02-20T00:18:16.179Z
- **Workflow ID:** `bdb2002c-3056-47ef-ad8c-aa916e295a56`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Contract — Signed - Confirmation Email

- **Status:** Inactive (draft)
- **Use case:** Automate contract follow-ups, signature handling, and opportunity/contact updates.
- **Version:** 23
- **Created:** 2024-07-05T16:45:55.943Z
- **Updated:** 2026-02-19T23:28:20.778Z
- **Workflow ID:** `344d4a93-35d4-40ee-8d15-4ccb311b31de`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

---

## Event / lead-magnet email automations

**Use case (category):** Auto-email presentation decks, market reports, or nurture sequences after event/form submissions.

| Status | Workflow | Version | Created | Updated | ID |
| --- | --- | ---: | --- | --- | --- |
| Active | CampEx 2024 Form - Email Automations | 8 | 2024-11-18 | 2025-11-04 | `0bc42ea1-8e24-41c9-a13a-8146434ef82b` |
| Active | Campex 2024 Form Auto-Email Presentation Deck | 10 | 2024-11-14 | 2025-11-04 | `323d8746-ff5e-4271-acf7-12b846ed46e2` |
| Active | Campground Solutions Summit West 2025 Form Auto-Email Market Report | 17 | 2025-04-01 | 2025-11-04 | `873a4560-17ae-4a03-9a0b-77a01141f5a1` |
| Active | COE 2025 Form - Email Automations | 11 | 2025-12-03 | 2025-12-03 | `94738f5d-88d7-4da5-82ce-26ea93f868c2` |
| Active | Glamping Show 2024 Form Auto-Email Presentation  Deck | 19 | 2024-09-20 | 2025-11-04 | `a0cf2153-ec34-4211-9865-a278a40400ef` |
| Active | Marketing – Glamping Show 2025 Form Auto-Email Presentation  Deck | 5 | 2025-09-30 | 2025-10-01 | `4146529f-bdc2-4e0a-a501-d54e74696157` |
| Active | Marketing – The Glamping Show 2025 Form - Email Automations | 8 | 2025-09-30 | 2025-10-01 | `84fe8093-4b5b-433c-a9a1-2cb8cab02f07` |
| Active | Marketing — Glamping Report Delivery | 9 | 2023-08-30 | 2026-02-19 | `2017c360-d9ff-4aea-90d8-b526ea55fad7` |
| Active | OHCE 2025 Form - Email Automations | 19 | 2025-11-04 | 2025-11-08 | `78d0d5c9-359a-42ed-9d82-83d9c1d57bf5` |
| Active | The Glamping Show 2024 Form - Email Automations | 8 | 2024-10-21 | 2025-11-04 | `47a6f370-f368-45b9-9d74-6287539f1529` |

### Details

#### CampEx 2024 Form - Email Automations

- **Status:** Active (published)
- **Use case:** Auto-email presentation decks, market reports, or nurture sequences after event/form submissions.
- **Version:** 8
- **Created:** 2024-11-18T18:48:43.287Z
- **Updated:** 2025-11-04T22:33:15.427Z
- **Workflow ID:** `0bc42ea1-8e24-41c9-a13a-8146434ef82b`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Campex 2024 Form Auto-Email Presentation Deck

- **Status:** Active (published)
- **Use case:** Auto-email presentation decks, market reports, or nurture sequences after event/form submissions.
- **Version:** 10
- **Created:** 2024-11-14T17:55:01.447Z
- **Updated:** 2025-11-04T22:33:22.879Z
- **Workflow ID:** `323d8746-ff5e-4271-acf7-12b846ed46e2`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Campground Solutions Summit West 2025 Form Auto-Email Market Report

- **Status:** Active (published)
- **Use case:** Auto-email presentation decks, market reports, or nurture sequences after event/form submissions.
- **Version:** 17
- **Created:** 2025-04-01T22:19:45.417Z
- **Updated:** 2025-11-04T22:33:33.848Z
- **Workflow ID:** `873a4560-17ae-4a03-9a0b-77a01141f5a1`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### COE 2025 Form - Email Automations

- **Status:** Active (published)
- **Use case:** Auto-email presentation decks, market reports, or nurture sequences after event/form submissions.
- **Version:** 11
- **Created:** 2025-12-03T17:51:01.321Z
- **Updated:** 2025-12-03T18:23:30.096Z
- **Workflow ID:** `94738f5d-88d7-4da5-82ce-26ea93f868c2`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Glamping Show 2024 Form Auto-Email Presentation  Deck

- **Status:** Active (published)
- **Use case:** Auto-email presentation decks, market reports, or nurture sequences after event/form submissions.
- **Version:** 19
- **Created:** 2024-09-20T21:44:23.731Z
- **Updated:** 2025-11-04T22:33:28.377Z
- **Workflow ID:** `a0cf2153-ec34-4211-9865-a278a40400ef`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Marketing – Glamping Show 2025 Form Auto-Email Presentation  Deck

- **Status:** Active (published)
- **Use case:** Auto-email presentation decks, market reports, or nurture sequences after event/form submissions.
- **Version:** 5
- **Created:** 2025-09-30T13:23:18.910Z
- **Updated:** 2025-10-01T16:29:22.632Z
- **Workflow ID:** `4146529f-bdc2-4e0a-a501-d54e74696157`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Marketing – The Glamping Show 2025 Form - Email Automations

- **Status:** Active (published)
- **Use case:** Auto-email presentation decks, market reports, or nurture sequences after event/form submissions.
- **Version:** 8
- **Created:** 2025-09-30T13:23:35.068Z
- **Updated:** 2025-10-01T18:41:49.009Z
- **Workflow ID:** `84fe8093-4b5b-433c-a9a1-2cb8cab02f07`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Marketing — Glamping Report Delivery

- **Status:** Active (published)
- **Use case:** Auto-email presentation decks, market reports, or nurture sequences after event/form submissions.
- **Version:** 9
- **Created:** 2023-08-30T23:15:16.464Z
- **Updated:** 2026-02-19T18:07:48.750Z
- **Workflow ID:** `2017c360-d9ff-4aea-90d8-b526ea55fad7`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### OHCE 2025 Form - Email Automations

- **Status:** Active (published)
- **Use case:** Auto-email presentation decks, market reports, or nurture sequences after event/form submissions.
- **Version:** 19
- **Created:** 2025-11-04T22:33:01.117Z
- **Updated:** 2025-11-08T00:09:07.259Z
- **Workflow ID:** `78d0d5c9-359a-42ed-9d82-83d9c1d57bf5`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### The Glamping Show 2024 Form - Email Automations

- **Status:** Active (published)
- **Use case:** Auto-email presentation decks, market reports, or nurture sequences after event/form submissions.
- **Version:** 8
- **Created:** 2024-10-21T21:33:00.035Z
- **Updated:** 2025-11-04T22:33:39.795Z
- **Workflow ID:** `47a6f370-f368-45b9-9d74-6287539f1529`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

---

## Google Contacts sync

**Use case (category):** Sync or tag Google Contacts into GHL.

| Status | Workflow | Version | Created | Updated | ID |
| --- | --- | ---: | --- | --- | --- |
| Active | Google Contact - Add 'Email Referral' Tag Trigger | 4 | 2026-04-09 | 2026-04-09 | `211847a9-41e4-4f3e-ba2d-f874d07445a3` |
| Active | Google Contacts Sync | 12 | 2026-04-07 | 2026-04-09 | `43fbe425-4b1c-4528-a323-b808617076e0` |

### Details

#### Google Contact - Add 'Email Referral' Tag Trigger

- **Status:** Active (published)
- **Use case:** Sync or tag Google Contacts into GHL.
- **Version:** 4
- **Created:** 2026-04-09T17:12:23.552Z
- **Updated:** 2026-04-09T17:19:36.594Z
- **Workflow ID:** `211847a9-41e4-4f3e-ba2d-f874d07445a3`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Google Contacts Sync

- **Status:** Active (published)
- **Use case:** Sync or tag Google Contacts into GHL.
- **Version:** 12
- **Created:** 2026-04-07T20:38:39.865Z
- **Updated:** 2026-04-09T17:11:34.894Z
- **Workflow ID:** `43fbe425-4b1c-4528-a323-b808617076e0`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

---

## Invoice & payment lifecycle

**Use case (category):** Drive invoice send/pay stages, job-number assignment, data-form triggers, and internal notifications.

| Status | Workflow | Version | Created | Updated | ID |
| --- | --- | ---: | --- | --- | --- |
| Active | Invoice — 1st Invoice Sent to Client | 19 | 2024-03-20 | 2026-02-19 | `dd125847-7c07-42c5-b0c3-61623699e590` |
| Active | Invoice — Once Sent, Automatically Add Job Number to Contact | 12 | 2024-12-06 | 2026-05-06 | `23092a85-c0ab-403e-835d-0bcf992b6fe9` |
| Active | Invoice — Payment 1 of 2 Completed: Update Contact, etc. | 66 | 2024-09-06 | 2026-06-29 | `8f4fa569-846f-4a05-8e65-c54066a6c776` |
| Active | Invoice — Payment 1 Sent: Send Data Form | 5 | 2026-06-29 | 2026-06-30 | `77b60e61-4b6f-4879-83a1-6226774f9d03` |
| Active | Invoice — Payment 2 of 2 - Payment Completed Internal Notification | 16 | 2023-09-22 | 2026-02-19 | `7273d4ac-299e-4a95-961e-f77f2cfd6b2a` |
| Active | Invoice — Payment 2 of 2 - Send 2nd Invoice for Payment | 18 | 2023-10-27 | 2026-02-19 | `0ec3fe0f-aadc-4076-8fc2-5a39c015f0c6` |
| Inactive | (5) Invoice – Payment 1 of 2 - Paid Notification - OLD | 28 | 2023-08-22 | 2025-05-14 | `cb7a4cb6-75fa-4ab6-a28a-5bff809e06b1` |

### Details

#### Invoice — 1st Invoice Sent to Client

- **Status:** Active (published)
- **Use case:** Drive invoice send/pay stages, job-number assignment, data-form triggers, and internal notifications.
- **Version:** 19
- **Created:** 2024-03-20T16:36:01.559Z
- **Updated:** 2026-02-19T23:40:10.137Z
- **Workflow ID:** `dd125847-7c07-42c5-b0c3-61623699e590`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Invoice — Once Sent, Automatically Add Job Number to Contact

- **Status:** Active (published)
- **Use case:** Drive invoice send/pay stages, job-number assignment, data-form triggers, and internal notifications.
- **Version:** 12
- **Created:** 2024-12-06T17:30:52.054Z
- **Updated:** 2026-05-06T20:28:52.847Z
- **Workflow ID:** `23092a85-c0ab-403e-835d-0bcf992b6fe9`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Invoice — Payment 1 of 2 Completed: Update Contact, etc.

- **Status:** Active (published)
- **Use case:** Drive invoice send/pay stages, job-number assignment, data-form triggers, and internal notifications.
- **Version:** 66
- **Created:** 2024-09-06T19:21:36.822Z
- **Updated:** 2026-06-29T18:16:50.178Z
- **Workflow ID:** `8f4fa569-846f-4a05-8e65-c54066a6c776`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Invoice — Payment 1 Sent: Send Data Form

- **Status:** Active (published)
- **Use case:** Drive invoice send/pay stages, job-number assignment, data-form triggers, and internal notifications.
- **Version:** 5
- **Created:** 2026-06-29T18:04:22.817Z
- **Updated:** 2026-06-30T21:00:48.686Z
- **Workflow ID:** `77b60e61-4b6f-4879-83a1-6226774f9d03`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Invoice — Payment 2 of 2 - Payment Completed Internal Notification

- **Status:** Active (published)
- **Use case:** Drive invoice send/pay stages, job-number assignment, data-form triggers, and internal notifications.
- **Version:** 16
- **Created:** 2023-09-22T20:30:27.291Z
- **Updated:** 2026-02-19T23:40:26.203Z
- **Workflow ID:** `7273d4ac-299e-4a95-961e-f77f2cfd6b2a`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Invoice — Payment 2 of 2 - Send 2nd Invoice for Payment

- **Status:** Active (published)
- **Use case:** Drive invoice send/pay stages, job-number assignment, data-form triggers, and internal notifications.
- **Version:** 18
- **Created:** 2023-10-27T20:50:30.277Z
- **Updated:** 2026-02-19T23:40:32.903Z
- **Workflow ID:** `0ec3fe0f-aadc-4076-8fc2-5a39c015f0c6`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### (5) Invoice – Payment 1 of 2 - Paid Notification - OLD

- **Status:** Inactive (draft)
- **Use case:** Drive invoice send/pay stages, job-number assignment, data-form triggers, and internal notifications.
- **Version:** 28
- **Created:** 2023-08-22T16:43:11.788Z
- **Updated:** 2025-05-14T16:38:29.301Z
- **Workflow ID:** `cb7a4cb6-75fa-4ab6-a28a-5bff809e06b1`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

---

## Newsletter / marketing tags

**Use case (category):** Tag contacts from newsletter signups for marketing segmentation.

| Status | Workflow | Version | Created | Updated | ID |
| --- | --- | ---: | --- | --- | --- |
| Active | Marketing — Newsletter Signup: Add Tag to Contact | 6 | 2024-09-10 | 2026-02-19 | `a1e0aa5a-0c3c-4ce8-8bae-6287b31c78da` |

### Details

#### Marketing — Newsletter Signup: Add Tag to Contact

- **Status:** Active (published)
- **Use case:** Tag contacts from newsletter signups for marketing segmentation.
- **Version:** 6
- **Created:** 2024-09-10T20:01:17.272Z
- **Updated:** 2026-02-19T18:07:55.915Z
- **Workflow ID:** `a1e0aa5a-0c3c-4ce8-8bae-6287b31c78da`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

---

## Project completion

**Use case (category):** Post-delivery author handoff and satisfaction survey.

| Status | Workflow | Version | Created | Updated | ID |
| --- | --- | ---: | --- | --- | --- |
| Active | Project Complete — Author to Author Email | 6 | 2025-01-20 | 2026-02-19 | `8352b40d-593d-4765-a81f-2f21091d4147` |
| Inactive | Project Complete — Send Satisfaction Survey | 8 | 2025-01-20 | 2026-02-19 | `6f2b8987-647d-4113-954d-195c5f9eaa7d` |

### Details

#### Project Complete — Author to Author Email

- **Status:** Active (published)
- **Use case:** Post-delivery author handoff and satisfaction survey.
- **Version:** 6
- **Created:** 2025-01-20T22:49:53.259Z
- **Updated:** 2026-02-19T18:08:23.553Z
- **Workflow ID:** `8352b40d-593d-4765-a81f-2f21091d4147`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

#### Project Complete — Send Satisfaction Survey

- **Status:** Inactive (draft)
- **Use case:** Post-delivery author handoff and satisfaction survey.
- **Version:** 8
- **Created:** 2025-01-20T18:26:14.798Z
- **Updated:** 2026-02-19T18:08:32.427Z
- **Workflow ID:** `6f2b8987-647d-4113-954d-195c5f9eaa7d`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

---

## Review / report delivery

**Use case (category):** Move opportunity stage when report is sent to client.

| Status | Workflow | Version | Created | Updated | ID |
| --- | --- | ---: | --- | --- | --- |
| Inactive | Review Process: Move Opportunity to 'Report Sent to Client' | 2 | 2026-02-11 | 2026-02-11 | `798859d4-5c50-443a-8d78-e800d6f866d2` |

### Details

#### Review Process: Move Opportunity to 'Report Sent to Client'

- **Status:** Inactive (draft)
- **Use case:** Move opportunity stage when report is sent to client.
- **Version:** 2
- **Created:** 2026-02-11T20:01:50.080Z
- **Updated:** 2026-02-11T20:06:41.053Z
- **Workflow ID:** `798859d4-5c50-443a-8d78-e800d6f866d2`
- **Location ID:** `JCHQyFysCX49WT31jkM1`
- **Description / steps:** Not available via public API — inspect in GHL Automation UI.

---

## Full alphabetical index

| Status | Name | Category | Updated | Version |
| --- | --- | --- | --- | ---: |
| Inactive | (1) Onboarding Call - Appointment Confirmation + Reminder | Appointment confirmations & reminders | 2025-12-12 | 4 |
| Inactive | (5) Invoice – Payment 1 of 2 - Paid Notification - OLD | Invoice & payment lifecycle | 2025-05-14 | 28 |
| Active | CampEx 2024 Form - Email Automations | Event / lead-magnet email automations | 2025-11-04 | 8 |
| Active | Campex 2024 Form Auto-Email Presentation Deck | Event / lead-magnet email automations | 2025-11-04 | 10 |
| Active | Campground Solutions Summit West 2025 Form Auto-Email Market Report | Event / lead-magnet email automations | 2025-11-04 | 17 |
| Active | COE 2025 Form - Email Automations | Event / lead-magnet email automations | 2025-12-03 | 11 |
| Active | Contract Signed - Referral Email Reminder | Contract lifecycle | 2026-02-19 | 6 |
| Active | Contract – Initial Info 1 YR Follow up If not Signed | Contract lifecycle | 2025-07-10 | 3 |
| Active | Contract – Response from FU and send 2nd FU | Contract lifecycle | 2026-07-08 | 4 |
| Active | Contract — Follow up If not Signed | Contract lifecycle | 2026-06-24 | 21 |
| Active | Contract — Initial Info LT Follow up If not Signed | Contract lifecycle | 2026-02-19 | 3 |
| Inactive | Contract — Signed - Confirmation Email | Contract lifecycle | 2026-02-19 | 23 |
| Active | Contract — Signed - Update Opportunity & Contact | Contract lifecycle | 2026-02-20 | 14 |
| Active | Data Form — Submitted | Client data forms | 2026-03-09 | 32 |
| Active | Follow Up Client Data Form | Client data forms | 2026-02-19 | 11 |
| Active | Glamping Show 2024 Form Auto-Email Presentation  Deck | Event / lead-magnet email automations | 2025-11-04 | 19 |
| Active | Google Contact - Add 'Email Referral' Tag Trigger | Google Contacts sync | 2026-04-09 | 4 |
| Active | Google Contacts Sync | Google Contacts sync | 2026-04-09 | 12 |
| Active | Invoice — 1st Invoice Sent to Client | Invoice & payment lifecycle | 2026-02-19 | 19 |
| Active | Invoice — Once Sent, Automatically Add Job Number to Contact | Invoice & payment lifecycle | 2026-05-06 | 12 |
| Active | Invoice — Payment 1 of 2 Completed: Update Contact, etc. | Invoice & payment lifecycle | 2026-06-29 | 66 |
| Active | Invoice — Payment 1 Sent: Send Data Form | Invoice & payment lifecycle | 2026-06-30 | 5 |
| Active | Invoice — Payment 2 of 2 - Payment Completed Internal Notification | Invoice & payment lifecycle | 2026-02-19 | 16 |
| Active | Invoice — Payment 2 of 2 - Send 2nd Invoice for Payment | Invoice & payment lifecycle | 2026-02-19 | 18 |
| Active | Marketing – Glamping Show 2025 Form Auto-Email Presentation  Deck | Event / lead-magnet email automations | 2025-10-01 | 5 |
| Active | Marketing – The Glamping Show 2025 Form - Email Automations | Event / lead-magnet email automations | 2025-10-01 | 8 |
| Active | Marketing — Glamping Report Delivery | Event / lead-magnet email automations | 2026-02-19 | 9 |
| Active | Marketing — Newsletter Signup: Add Tag to Contact | Newsletter / marketing tags | 2026-02-19 | 6 |
| Active | OHCE 2025 Form - Email Automations | Event / lead-magnet email automations | 2025-11-08 | 19 |
| Active | Project Complete — Author to Author Email | Project completion | 2026-02-19 | 6 |
| Inactive | Project Complete — Send Satisfaction Survey | Project completion | 2026-02-19 | 8 |
| Inactive | Review Process: Move Opportunity to 'Report Sent to Client' | Review / report delivery | 2026-02-11 | 2 |
| Active | Sales – Onboarding Call - Appointment Confirmation + Reminder | Appointment confirmations & reminders | 2026-01-26 | 6 |
| Active | Sales — Intro Call - Appointment Confirmation + Reminder | Appointment confirmations & reminders | 2026-02-19 | 36 |
| Active | Sales — Kristin 1-on-1 Call - Appointment Confirmation + Reminder | Appointment confirmations & reminders | 2026-02-19 | 8 |
| Active | Sales — Shari Consulting Call - Appointment Confirmation + Reminder | Appointment confirmations & reminders | 2026-02-19 | 10 |
| Active | The Glamping Show 2024 Form - Email Automations | Event / lead-magnet email automations | 2025-11-04 | 8 |
