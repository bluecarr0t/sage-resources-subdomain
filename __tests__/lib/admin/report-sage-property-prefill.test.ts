import {
  buildSagePropertyDraftFromReport,
  sagePropertyCreatePayloadFromDraft,
} from '@/lib/admin/report-sage-property-prefill';

describe('report-sage-property-prefill', () => {
  it('prefills location and name from report fields', () => {
    const draft = buildSagePropertyDraftFromReport({
      property_name: 'Arbor Camp',
      address_1: '18 McDonnell Lane',
      city: 'Ellsworth',
      state: 'ME',
      zip_code: '04605',
      total_sites: 120,
      market_type: 'rv',
      latitude: 44.57,
      longitude: -68.42,
    });

    expect(draft.property_name).toBe('Arbor Camp');
    expect(draft.address).toBe('18 McDonnell Lane');
    expect(draft.city).toBe('Ellsworth');
    expect(draft.state).toBe('ME');
    expect(draft.zip_code).toBe('04605');
    expect(draft.property_type).toBe('RV Resort');
    expect(draft.property_total_sites).toBe('120');
    expect(draft.lat).toBe('44.57');
    expect(draft.discovery_source).toBe('Past Report');
  });

  it('builds API payload with trimmed required fields', () => {
    const payload = sagePropertyCreatePayloadFromDraft(
      buildSagePropertyDraftFromReport({
        property_name: ' Test ',
        city: 'Ellsworth',
        state: 'ME',
      })
    );

    expect(payload.property_name).toBe('Test');
    expect(payload.city).toBe('Ellsworth');
    expect(payload.state).toBe('ME');
    expect(payload.country).toBe('United States');
  });
});
