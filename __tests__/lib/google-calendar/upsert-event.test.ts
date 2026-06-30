/**
 * @jest-environment node
 */

const mockInsert = jest.fn().mockResolvedValue('new-event-id');
const mockList = jest.fn();
const mockPatch = jest.fn();

jest.mock('@/lib/google-calendar/client', () => ({
  createGoogleCalendarClientForUser: jest.fn(() => ({
    events: {
      list: (...args: unknown[]) => mockList(...args),
      patch: (...args: unknown[]) => mockPatch(...args),
    },
  })),
}));

jest.mock('@/lib/google-calendar/insert-event', () => ({
  insertGoogleCalendarEvent: (...args: unknown[]) => mockInsert(...args),
}));

import { upsertGoogleCalendarEvent } from '@/lib/google-calendar/upsert-event';

const sampleEvent = {
  summary: 'Review: Job #26-100A-01',
  iCalUID: 'sage-pipeline-review-2026 Jobs-26-100A-01@sageoutdooradvisory.com',
  start: { dateTime: '2026-06-25T09:00:00', timeZone: 'America/New_York' },
  end: { dateTime: '2026-06-25T09:30:00', timeZone: 'America/New_York' },
};

describe('upsertGoogleCalendarEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts when no existing event matches the iCalUID', async () => {
    mockList.mockResolvedValue({ data: { items: [] } });

    const eventId = await upsertGoogleCalendarEvent({
      calendarUserEmail: 'pm@sageoutdooradvisory.com',
      event: sampleEvent,
    });

    expect(mockInsert).toHaveBeenCalled();
    expect(mockPatch).not.toHaveBeenCalled();
    expect(eventId).toBe('new-event-id');
  });

  it('patches when an existing event matches the iCalUID', async () => {
    mockList.mockResolvedValue({ data: { items: [{ id: 'existing-event-id' }] } });
    mockPatch.mockResolvedValue({ data: { id: 'existing-event-id' } });

    const eventId = await upsertGoogleCalendarEvent({
      calendarUserEmail: 'pm@sageoutdooradvisory.com',
      event: sampleEvent,
    });

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: 'primary',
        eventId: 'existing-event-id',
        sendUpdates: 'all',
        requestBody: sampleEvent,
      })
    );
    expect(eventId).toBe('existing-event-id');
  });
});
