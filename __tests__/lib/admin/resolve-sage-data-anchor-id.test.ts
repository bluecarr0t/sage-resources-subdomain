import { flattenLinkedSageProperty } from '@/lib/admin/resolve-sage-data-anchor-id';

describe('flattenLinkedSageProperty', () => {
  const sample = {
    id: 42,
    property_name: 'Test Resort',
    address: '1 Main St',
    city: 'Austin',
    state: 'TX',
    zip_code: '78701',
    is_open: 'Under Construction',
    research_status: 'published',
    slug: 'test-resort',
    property_id: '00000000-0000-0000-0000-000000000001',
    property_type: 'Glamping',
  };

  it('returns null for nullish input', () => {
    expect(flattenLinkedSageProperty(null)).toBeNull();
    expect(flattenLinkedSageProperty(undefined)).toBeNull();
  });

  it('returns object input as-is', () => {
    expect(flattenLinkedSageProperty(sample)).toEqual(sample);
  });

  it('returns first element from array input', () => {
    expect(flattenLinkedSageProperty([sample])).toEqual(sample);
  });

  it('returns null for empty array', () => {
    expect(flattenLinkedSageProperty([])).toBeNull();
  });
});
