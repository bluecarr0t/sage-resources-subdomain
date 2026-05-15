import { summarizeRowForDescription } from '@/lib/glamping-description-research/db-row-summary';
import { validateSeoDescription } from '@/lib/glamping-description-research/validate-description';

describe('summarizeRowForDescription', () => {
  it('includes location, unit type, and yes amenities', () => {
    const s = summarizeRowForDescription({
      property_name: 'Test Ranch',
      city: 'Austin',
      state: 'TX',
      country: 'United States',
      unit_type: 'Yurt',
      property_pool: 'Yes',
      unit_wifi: 'Yes',
    });
    expect(s).toContain('Test Ranch');
    expect(s).toContain('Austin');
    expect(s).toContain('TX');
    expect(s).toContain('Yurt');
    expect(s).toContain('Pool');
    expect(s).toContain('Wifi');
  });
});

describe('validateSeoDescription', () => {
  const base =
    'Timberline Glamping near Austin TX offers safari tents and yurts for guests who want a comfortable outdoor stay. ' +
    'Timberline Glamping sits outside Austin with easy access to Hill Country trails. ' +
    'Amenities include a seasonal pool and wifi in select units. ' +
    'The property welcomes families and provides clear arrival details on its website. ' +
    'Bookings are recommended for weekends in spring and fall when demand is higher. ' +
    'Visitors can expect furnished units with beds and linens plus private bathroom options on select sites. ' +
    'Evening campfires are allowed in designated rings and pets may be permitted on some units. ' +
    'The team focuses on a relaxed pace and simple check-in so guests can settle in quickly. ' +
    'Winter stays can be quieter with fewer neighbors and more open views across the meadow. ' +
    'Summer travelers should plan for warm afternoons and cooler nights typical of central Texas. ' +
    'On-site parking is available and the route from Austin is mostly highway then county roads. ' +
    'Guests often combine a stay with winery visits and short hikes in nearby parks. ' +
    'Rates vary by season and unit type so the website remains the best place to confirm details. ' +
    'The property name Timberline Glamping appears on signage at the entrance for easy navigation.';

  it('passes for valid copy with city, state, and name', () => {
    const r = validateSeoDescription({
      text: base,
      city: 'Austin',
      state: 'TX',
      propertyName: 'Timberline Glamping',
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('fails when city is missing from text', () => {
    const r = validateSeoDescription({
      text: base.replace(/Austin/g, 'the city'),
      city: 'Austin',
      state: 'TX',
      propertyName: 'Timberline Glamping',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('city'))).toBe(true);
  });

  it('fails on banned phrase', () => {
    const r = validateSeoDescription({
      text: `${base} It is the best in the world for luxury.`,
      city: 'Austin',
      state: 'TX',
      propertyName: 'Timberline Glamping',
    });
    expect(r.ok).toBe(false);
  });
});
