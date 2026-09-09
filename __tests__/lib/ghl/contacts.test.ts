/**
 * @jest-environment node
 */

import {
  GHL_CONTACT_TYPE_CUSTOM_FIELD_ID,
  GHL_GLAMPING_MARKET_OVERVIEW_TAG,
  addGhlContactTagByEmail,
  setGhlContactTagRetryDelaysForTests,
  syncGlampingMarketOverviewContactAsync,
  upsertGhlMarketOverviewContact,
} from '@/lib/ghl/contacts';

const mockFetch = jest.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body == null ? '' : JSON.stringify(body)),
  } as Response;
}

describe('ghl contact tagging', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GHL_TOKEN = 'pit-abc';
    process.env.GHL_LOCATION_ID = 'loc-1';
    setGhlContactTagRetryDelaysForTests([0, 0]);
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
    setGhlContactTagRetryDelaysForTests([0, 750, 2000]);
  });

  it('adds the Market Overview tag to a contact found by email', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(200, { contact: { id: 'contact-1' } }))
      .mockResolvedValueOnce(jsonResponse(200, { tags: [GHL_GLAMPING_MARKET_OVERVIEW_TAG] }));

    await expect(
      addGhlContactTagByEmail('Jane@Example.com', GHL_GLAMPING_MARKET_OVERVIEW_TAG)
    ).resolves.toBe(true);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const lookupUrl = String(mockFetch.mock.calls[0]?.[0]);
    expect(lookupUrl).toContain('/contacts/search/duplicate?');
    expect(lookupUrl).toContain('locationId=loc-1');
    expect(lookupUrl).toContain('email=jane%40example.com');
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/contacts/contact-1/tags'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tags: [GHL_GLAMPING_MARKET_OVERVIEW_TAG] }),
      })
    );
  });

  it('retries lookup when the pixel contact is not ready yet', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(404, { message: 'not found' }))
      .mockResolvedValueOnce(jsonResponse(200, { contact: { id: 'contact-2' } }))
      .mockResolvedValueOnce(jsonResponse(200, { tags: [GHL_GLAMPING_MARKET_OVERVIEW_TAG] }));

    await expect(
      addGhlContactTagByEmail('jane@example.com', GHL_GLAMPING_MARKET_OVERVIEW_TAG)
    ).resolves.toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('returns false when no contact is found', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockFetch.mockResolvedValue(jsonResponse(200, {}));

    await expect(
      addGhlContactTagByEmail('missing@example.com', GHL_GLAMPING_MARKET_OVERVIEW_TAG)
    ).resolves.toBe(false);
    expect(mockFetch.mock.calls.every((call) => String(call[0]).includes('/duplicate'))).toBe(
      true
    );
    warn.mockRestore();
  });

  it('skips tagging without GHL auth config', async () => {
    delete process.env.GHL_TOKEN;
    delete process.env.GHL_LOCATION_ID;
    await expect(
      addGhlContactTagByEmail('jane@example.com', GHL_GLAMPING_MARKET_OVERVIEW_TAG)
    ).resolves.toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('creates a contact with name, Contact Type, and tag when none exists', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(404, { message: 'not found' }))
      .mockResolvedValueOnce(jsonResponse(200, { contact: { id: 'new-1' } }))
      .mockResolvedValueOnce(jsonResponse(200, { tags: [GHL_GLAMPING_MARKET_OVERVIEW_TAG] }));

    await expect(
      upsertGhlMarketOverviewContact({
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        businessType: 'developer',
      })
    ).resolves.toEqual({ status: 'created', contactId: 'new-1' });

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/contacts/'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          locationId: 'loc-1',
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          tags: [GHL_GLAMPING_MARKET_OVERVIEW_TAG],
          customFields: [
            {
              id: GHL_CONTACT_TYPE_CUSTOM_FIELD_ID,
              field_value: 'Developer',
            },
          ],
        }),
      })
    );
  });

  it('updates an existing contact without replacing other tags', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(200, { contact: { id: 'contact-1' } }))
      .mockResolvedValueOnce(jsonResponse(200, { contact: { id: 'contact-1' } }))
      .mockResolvedValueOnce(jsonResponse(200, { tags: [GHL_GLAMPING_MARKET_OVERVIEW_TAG] }));

    await expect(
      upsertGhlMarketOverviewContact({
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        businessType: 'investor',
      })
    ).resolves.toEqual({ status: 'updated', contactId: 'contact-1' });

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/contacts/contact-1'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          firstName: 'Jane',
          lastName: 'Doe',
          customFields: [
            {
              id: GHL_CONTACT_TYPE_CUSTOM_FIELD_ID,
              field_value: 'Investor',
            },
          ],
        }),
      })
    );
    expect(String(mockFetch.mock.calls[1]?.[1]?.body)).not.toContain('"tags"');
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/contacts/contact-1/tags'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tags: [GHL_GLAMPING_MARKET_OVERVIEW_TAG] }),
      })
    );
  });

  it('omits Contact Type when business type is missing', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(200, { contact: { id: 'contact-1' } }))
      .mockResolvedValueOnce(jsonResponse(200, { contact: { id: 'contact-1' } }))
      .mockResolvedValueOnce(jsonResponse(200, { tags: [GHL_GLAMPING_MARKET_OVERVIEW_TAG] }));

    await upsertGhlMarketOverviewContact({
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(mockFetch.mock.calls[1]?.[1]?.body).toBe(
      JSON.stringify({ firstName: 'Jane', lastName: 'Doe' })
    );
  });

  it('does not tag Pipeline Quarterly gate contacts', async () => {
    syncGlampingMarketOverviewContactAsync('outdoor-hospitality-pipeline', {
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('tags Market Overview contacts asynchronously', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(200, { contact: { id: 'contact-1' } }))
      .mockResolvedValueOnce(jsonResponse(200, { contact: { id: 'contact-1' } }))
      .mockResolvedValueOnce(jsonResponse(200, { tags: [GHL_GLAMPING_MARKET_OVERVIEW_TAG] }));

    syncGlampingMarketOverviewContactAsync('glamping-market-overview', {
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      businessType: 'developer',
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockFetch).toHaveBeenCalled();
  });
});
