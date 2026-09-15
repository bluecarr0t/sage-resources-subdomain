/**
 * @jest-environment node
 */

import { GHL_CONTACT_TYPE_CUSTOM_FIELD_ID } from '@/lib/ghl/contacts';
import {
  GHL_GLAMPING_SHOW_QUIZ_TAG,
  GHL_QUIZ_GETTING_CLOSE_TAG,
  GHL_QUIZ_JUST_EXPLORING_TAG,
  GHL_QUIZ_READY_NOW_TAG,
} from '@/lib/ghl/tags';
import { upsertGhlGlampingShowQuizContact } from '@/lib/ghl/glamping-show-quiz-contact';

const mockFetch = jest.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body == null ? '' : JSON.stringify(body)),
  } as Response;
}

const input = {
  email: 'Jane@Example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  company: 'Open Sky',
  region: 'Utah',
  phone: '312-555-0199',
  answers: {
    role: 'developer_operator' as const,
    stage: 'has_plans' as const,
    need: 'appraisal' as const,
    timeline: '30_days' as const,
  },
  outcome: 'ready_now' as const,
};

describe('upsertGhlGlampingShowQuizContact', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GHL_TOKEN = 'pit-abc';
    process.env.GHL_LOCATION_ID = 'loc-1';
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates a tagged contact with company, region, phone, and Contact Type', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(404, { message: 'not found' }))
      .mockResolvedValueOnce(jsonResponse(200, { contact: { id: 'new-1' } }))
      .mockResolvedValueOnce(jsonResponse(200, { tags: [] }));

    await expect(upsertGhlGlampingShowQuizContact(input)).resolves.toEqual({
      status: 'created',
      contactId: 'new-1',
    });

    const createBody = JSON.parse(String(mockFetch.mock.calls[1]?.[1]?.body));
    expect(createBody.email).toBe('jane@example.com');
    expect(createBody.companyName).toBe('Open Sky');
    expect(createBody.state).toBe('Utah');
    expect(createBody.phone).toBe('312-555-0199');
    expect(createBody.tags).toEqual(
      expect.arrayContaining([GHL_GLAMPING_SHOW_QUIZ_TAG, GHL_QUIZ_READY_NOW_TAG])
    );
    expect(createBody.customFields).toEqual([
      { id: GHL_CONTACT_TYPE_CUSTOM_FIELD_ID, field_value: 'Developer' },
    ]);
  });

  it('replaces stale quiz tags on an existing contact without sending tags on PUT', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(200, { contact: { id: 'contact-1' } }))
      .mockResolvedValueOnce(jsonResponse(200, { contact: { id: 'contact-1' } }))
      .mockResolvedValueOnce(jsonResponse(200, {}))
      .mockResolvedValueOnce(jsonResponse(200, { tags: [] }));

    await expect(upsertGhlGlampingShowQuizContact(input)).resolves.toEqual({
      status: 'updated',
      contactId: 'contact-1',
    });

    expect(String(mockFetch.mock.calls[1]?.[1]?.body)).not.toContain('"tags"');
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/contacts/contact-1/tags'),
      expect.objectContaining({
        method: 'DELETE',
      })
    );
    const deleteBody = JSON.parse(String(mockFetch.mock.calls[2]?.[1]?.body));
    expect(deleteBody.tags).toEqual(
      expect.arrayContaining([GHL_QUIZ_JUST_EXPLORING_TAG, GHL_QUIZ_GETTING_CLOSE_TAG])
    );
    expect(deleteBody.tags).not.toContain(GHL_QUIZ_READY_NOW_TAG);
    expect(deleteBody.tags).not.toContain(GHL_GLAMPING_SHOW_QUIZ_TAG);
    expect(mockFetch).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('/contacts/contact-1/tags'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('skips without GHL auth config', async () => {
    delete process.env.GHL_TOKEN;
    delete process.env.GHL_LOCATION_ID;
    await expect(upsertGhlGlampingShowQuizContact(input)).resolves.toEqual({
      status: 'skipped',
      contactId: null,
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
