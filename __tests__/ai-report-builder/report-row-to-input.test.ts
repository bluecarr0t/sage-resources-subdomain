import { mapReportRowToDraftInput } from '@/lib/ai-report-builder/report-row-to-input';

describe('mapReportRowToDraftInput', () => {
  it('maps a reports row onto ReportDraftInput for regenerate', () => {
    const input = mapReportRowToDraftInput(
      {
        property_name: 'Pine Ridge',
        city: 'Bend',
        state: 'OR',
        zip_code: '97701',
        address_1: '10 Trail Rd',
        lot_size_acres: 12.5,
        parcel_number: '123',
        client_entity: 'Pine LLC',
        client_contact_name: 'Ada',
        unit_mix: [{ type: 'Cabin', count: 8 }],
        key_amenities: ['pool', 'spa'],
        market_type: 'glamping',
        service: 'Feasibility Study',
        county: 'Deschutes',
      },
      '26-100A-01'
    );

    expect(input.property_name).toBe('Pine Ridge');
    expect(input.city).toBe('Bend');
    expect(input.state).toBe('OR');
    expect(input.address_1).toBe('10 Trail Rd');
    expect(input.acres).toBe(12.5);
    expect(input.unit_mix).toEqual([{ type: 'Cabin', count: 8 }]);
    expect(input.amenities_description).toBe('pool, spa');
    expect(input.study_id).toBe('26-100A-01');
    expect(input.market_type).toBe('glamping');
    expect(input.include_web_research).toBe(true);
  });
});
