/**
 * @jest-environment node
 */

import {
  gateExtraction,
  pickPreferredExtraction,
  toContactInsertRow,
  externalIdForEmail,
} from '@/lib/contact-research/validate';
import {
  isJunkEmail,
  isGenericInbox,
  isValidEmailShape,
  normalizeEmail,
} from '@/lib/contact-research/junk-email';
import { insertWebResearchContact } from '@/lib/contact-research/insert';
import type { ContactInsertRow } from '@/lib/contact-research/types';

describe('contact-research junk email', () => {
  it('accepts normal business emails', () => {
    expect(isValidEmailShape('jane@glampingco.com')).toBe(true);
    expect(isJunkEmail('jane@glampingco.com')).toBe(false);
  });

  it('blocks noreply and transactional domains', () => {
    expect(isJunkEmail('noreply@example.com')).toBe(true);
    expect(isJunkEmail('dse@camail.docusign.net')).toBe(true);
    expect(isJunkEmail('quickbooks@notification.intuit.com')).toBe(true);
  });

  it('detects generic inboxes', () => {
    expect(isGenericInbox('info@resort.com')).toBe(true);
    expect(isGenericInbox('alex@resort.com')).toBe(false);
  });
});

describe('contact-research gateExtraction', () => {
  it('requires email and category with medium+ confidence', () => {
    const ok = gateExtraction({
      email: 'Owner@Resort.com',
      category: 'glamping_property_owner',
      confidence: 'medium',
      first_name: 'Ada',
      last_name: 'Owner',
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.extraction.email).toBe('owner@resort.com');
      expect(ok.extraction.category).toBe('glamping_property_owner');
    }
  });

  it('rejects missing category', () => {
    const result = gateExtraction({
      email: 'owner@resort.com',
      category: null,
      confidence: 'high',
    });
    expect(result).toEqual({ ok: false, reason: 'missing_or_invalid_category' });
  });

  it('rejects junk email', () => {
    const result = gateExtraction({
      email: 'noreply@resort.com',
      category: 'glamping_property_owner',
      confidence: 'high',
    });
    expect(result).toEqual({ ok: false, reason: 'junk_email' });
  });

  it('rejects low confidence', () => {
    const result = gateExtraction({
      email: 'owner@resort.com',
      category: 'unit_manufacturer',
      confidence: 'low',
    });
    expect(result).toEqual({ ok: false, reason: 'confidence_too_low' });
  });
});

describe('contact-research pickPreferredExtraction', () => {
  it('prefers person email over generic when confidence ties', () => {
    const picked = pickPreferredExtraction([
      {
        first_name: null,
        last_name: null,
        email: 'info@brand.com',
        phone: null,
        business_name: 'Brand',
        category: 'unit_manufacturer',
        confidence: 'high',
        evidence_snippet: 'info@brand.com',
      },
      {
        first_name: 'Sam',
        last_name: 'Lee',
        email: 'sam@brand.com',
        phone: null,
        business_name: 'Brand',
        category: 'unit_manufacturer',
        confidence: 'high',
        evidence_snippet: 'sam@brand.com',
      },
    ]);
    expect(picked?.email).toBe('sam@brand.com');
  });
});

describe('contact-research insert helpers', () => {
  it('builds Web Research rows with category and stable external_id', () => {
    const gated = gateExtraction({
      email: 'dev@example.com',
      category: 'outdoor_hospitality_developer',
      confidence: 'high',
      first_name: 'Dev',
    });
    expect(gated.ok).toBe(true);
    if (!gated.ok) return;

    const row = toContactInsertRow(gated.extraction, 'https://example.com/contact', 'seed=web');
    expect(row.source).toBe('Web Research');
    expect(row.category).toBe('outdoor_hospitality_developer');
    expect(row.tags).toBe('web_research,outdoor_hospitality_developer');
    expect(row.external_id).toBe(externalIdForEmail('dev@example.com'));
    expect(row.evidence_url).toBe('https://example.com/contact');
  });

  it('skips insert when email already exists', async () => {
    const existing = new Set([normalizeEmail('dup@example.com')]);
    const row: ContactInsertRow = {
      external_id: externalIdForEmail('dup@example.com'),
      first_name: null,
      last_name: null,
      phone: null,
      email: 'dup@example.com',
      business_name: null,
      tags: 'web_research,glamping_property_owner',
      source: 'Web Research',
      category: 'glamping_property_owner',
      evidence_url: 'https://example.com',
      research_notes: 'test',
    };

    const result = await insertWebResearchContact(
      {} as never,
      row,
      existing,
      { dryRun: true }
    );
    expect(result).toEqual({ status: 'skipped', reason: 'duplicate_email' });
  });

  it('dry-run insert marks email as seen', async () => {
    const existing = new Set<string>();
    const row: ContactInsertRow = {
      external_id: externalIdForEmail('new@example.com'),
      first_name: 'New',
      last_name: null,
      phone: null,
      email: 'new@example.com',
      business_name: 'New Co',
      tags: 'web_research,outdoor_hospitality_investor',
      source: 'Web Research',
      category: 'outdoor_hospitality_investor',
      evidence_url: 'https://example.com/team',
      research_notes: 'test',
    };

    const result = await insertWebResearchContact(
      {} as never,
      row,
      existing,
      { dryRun: true }
    );
    expect(result).toEqual({ status: 'inserted' });
    expect(existing.has('new@example.com')).toBe(true);
  });
});
