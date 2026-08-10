/**
 * Engagement letter field heuristics + name/entity reconciliation.
 */

import {
  heuristicExtractEngagementLetter,
  reconcilePropertyAndClientEntity,
  type EngagementLetterExtract,
} from '@/lib/ai-report-builder/engagement-letter-fields';

const SCRAMBLED_FIXTURE = `
Feasibility Study Engagement Letter
Contact Info: 	Date:David Baiko
Legal Business Name:
2374 Middleton Rd
IDENTIFICATION OF PROPERTY AND USE
6050 Riverview Rd
Ohio
1100539
Christmas Tree Farm, Fall Events, Primitive Camping
Peninsula
Glamping- Wellness	Heritage Farms
2026-07-28
baikodc@gmail.com
2166500625
Hudson 	Ohio 	44236
TBD
Nordic Wellness Glamping & Christmas Tree Farm
Decision making, Financing and Investor Support.
`;

function baseExtract(overrides: Partial<EngagementLetterExtract> = {}): EngagementLetterExtract {
  return {
    property_name: null,
    service: 'Feasibility Study',
    address_1: '6050 Riverview Rd',
    city: 'Peninsula',
    state: 'OH',
    zip_code: null,
    market_type: 'glamping',
    parcel_number: '1100539',
    client_entity: null,
    client_contact_name: 'David Baiko',
    client_address: '2374 Middleton Rd',
    client_city_state_zip: 'Hudson, OH 44236',
    client_email: 'baikodc@gmail.com',
    client_phone: '2166500625',
    engagement_date: '2026-07-28',
    current_use: 'Christmas Tree Farm, Fall Events, Primitive Camping',
    property_intended_for: 'TBD',
    intended_use_of_study: 'Decision making, Financing and Investor Support.',
    resort_type_raw: 'Glamping- Wellness',
    amenities_description: null,
    warnings: [],
    ...overrides,
  };
}

describe('heuristicExtractEngagementLetter', () => {
  it('maps key fields from scrambled engagement letter fixture text', () => {
    const extract = heuristicExtractEngagementLetter(SCRAMBLED_FIXTURE);
    expect(extract.client_contact_name).toBe('David Baiko');
    expect(extract.client_email).toBe('baikodc@gmail.com');
    expect(extract.client_phone).toBe('2166500625');
    expect(extract.engagement_date).toBe('2026-07-28');
    expect(extract.property_name).toMatch(/Nordic Wellness/);
    expect(extract.address_1).toMatch(/6050 Riverview/);
    expect(extract.client_address).toMatch(/2374 Middleton/);
    expect(extract.parcel_number).toBe('1100539');
    expect(extract.city).toBe('Peninsula');
    expect(extract.state).toBe('OH');
    expect(extract.client_entity).toBe('Heritage Farms');
    expect(extract.service).toBe('Feasibility Study');
    expect(extract.market_type).toBe('glamping');
    expect(extract.amenities_description).toMatch(/Current use of property/);
    expect(extract.amenities_description).not.toMatch(/baikodc@gmail\.com|2166500625|Client email|Client phone/);
    expect(extract.client_city_state_zip).toMatch(/Hudson/);
  });
});

describe('reconcilePropertyAndClientEntity', () => {
  it('moves Legal Business Name out of property_name when heuristic has the resort title', () => {
    const heuristic = heuristicExtractEngagementLetter(SCRAMBLED_FIXTURE);
    // Simulates LLM that filled city/state but swapped names (skips old merge path)
    const llmWrong = baseExtract({
      property_name: 'Heritage Farms',
      client_entity: null,
      city: 'Peninsula',
      state: 'OH',
    });

    const fixed = reconcilePropertyAndClientEntity(llmWrong, heuristic);
    expect(fixed.property_name).toMatch(/Nordic Wellness/);
    expect(fixed.client_entity).toBe('Heritage Farms');
    expect(fixed.warnings.some((w) => /Corrected resort name vs legal/i.test(w))).toBe(true);
  });

  it('fills blank client_entity from heuristic without changing a good resort name', () => {
    const heuristic = heuristicExtractEngagementLetter(SCRAMBLED_FIXTURE);
    const llmOk = baseExtract({
      property_name: 'Nordic Wellness Glamping & Christmas Tree Farm',
      client_entity: null,
    });

    const fixed = reconcilePropertyAndClientEntity(llmOk, heuristic);
    expect(fixed.property_name).toMatch(/Nordic Wellness/);
    expect(fixed.client_entity).toBe('Heritage Farms');
  });

  it('splits identical property_name and client_entity using heuristic pair', () => {
    const heuristic = heuristicExtractEngagementLetter(SCRAMBLED_FIXTURE);
    const llmDup = baseExtract({
      property_name: 'Heritage Farms',
      client_entity: 'Heritage Farms',
    });

    const fixed = reconcilePropertyAndClientEntity(llmDup, heuristic);
    expect(fixed.property_name).toMatch(/Nordic Wellness/);
    expect(fixed.client_entity).toBe('Heritage Farms');
  });
});
