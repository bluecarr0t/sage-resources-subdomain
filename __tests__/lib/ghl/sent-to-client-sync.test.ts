/**
 * @jest-environment node
 */

import {
  findStageIdByName,
  getOpportunityJobNumber,
  moveOpportunityToReportSentToClient,
  normalizeGhlOpportunityFieldKey,
  opportunityMatchesJobNumber,
  type GhlOpportunity,
} from '@/lib/ghl/opportunities';
import { didSentToClientFlipToYes } from '@/lib/ghl/sync-sent-to-client';
import { getGhlConfig, resetGhlMissingConfigLogForTests } from '@/lib/ghl/client';

const mockFetch = jest.fn();

describe('ghl sent-to-client helpers', () => {
  describe('didSentToClientFlipToYes', () => {
    it('is true only on No → Yes', () => {
      expect(didSentToClientFlipToYes({ sentToClient: 'No' }, { sentToClient: 'Yes' })).toBe(
        true
      );
      expect(
        didSentToClientFlipToYes({ sentToClient: 'No' }, { sentToClient: 'Yes — Sent at 03/02/26' })
      ).toBe(true);
      expect(didSentToClientFlipToYes(null, { sentToClient: 'Yes' })).toBe(true);
      expect(didSentToClientFlipToYes({ sentToClient: 'Yes' }, { sentToClient: 'Yes' })).toBe(
        false
      );
      expect(didSentToClientFlipToYes({ sentToClient: 'Yes' }, { sentToClient: 'No' })).toBe(
        false
      );
      expect(didSentToClientFlipToYes({ sentToClient: 'No' }, { sentToClient: 'No' })).toBe(
        false
      );
    });
  });

  describe('custom field matching', () => {
    it('normalizes opportunity.job_number keys', () => {
      expect(normalizeGhlOpportunityFieldKey('job_number')).toBe('job_number');
      expect(normalizeGhlOpportunityFieldKey('opportunity.job_number')).toBe('job_number');
      expect(normalizeGhlOpportunityFieldKey('Opportunity.Job_Number')).toBe('job_number');
    });

    it('matches exact job_number custom field values', () => {
      const opp: GhlOpportunity = {
        id: 'opp-1',
        customFields: [
          { key: 'opportunity.job_number', fieldValue: '26-100A-01' },
          { key: 'other', fieldValue: 'nope' },
        ],
      };
      expect(getOpportunityJobNumber(opp)).toBe('26-100A-01');
      expect(opportunityMatchesJobNumber(opp, '26-100A-01')).toBe(true);
      expect(opportunityMatchesJobNumber(opp, '26-100A-02')).toBe(false);
    });

    it('reads field_value snake_case payloads', () => {
      const opp: GhlOpportunity = {
        id: 'opp-2',
        customFields: [{ key: 'job_number', field_value: ' 26-200B-03 ' }],
      };
      expect(opportunityMatchesJobNumber(opp, '26-200B-03')).toBe(true);
    });
  });

  describe('findStageIdByName', () => {
    it('resolves Report Sent to Client within the configured pipeline', () => {
      const stageId = findStageIdByName(
        [
          {
            id: 'pipe-wrong',
            stages: [{ id: 's0', name: 'Report Sent to Client' }],
          },
          {
            id: 'pipe-right',
            stages: [
              { id: 's1', name: 'In Progress' },
              { id: 's2', name: 'report sent to client' },
            ],
          },
        ],
        'pipe-right',
        'Report Sent to Client'
      );
      expect(stageId).toBe('s2');
    });

    it('returns null when stage is missing', () => {
      expect(
        findStageIdByName(
          [{ id: 'pipe-right', stages: [{ id: 's1', name: 'In Progress' }] }],
          'pipe-right',
          'Report Sent to Client'
        )
      ).toBeNull();
    });
  });
});

describe('moveOpportunityToReportSentToClient', () => {
  const config = {
    token: 'pit-test',
    locationId: 'loc-1',
    pipelineId: 'pipe-1',
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function jsonResponse(body: unknown, ok = true, status = 200) {
    return {
      ok,
      status,
      text: async () => JSON.stringify(body),
    };
  }

  it('updates stage when a single job_number match is found', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          opportunities: [
            {
              id: 'opp-1',
              pipelineStageId: 'stage-old',
              customFields: [{ key: 'job_number', fieldValue: '26-100A-01' }],
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          pipelines: [
            {
              id: 'pipe-1',
              stages: [
                { id: 'stage-old', name: 'In Progress' },
                { id: 'stage-sent', name: 'Report Sent to Client' },
              ],
            },
          ],
        })
      )
      .mockResolvedValueOnce(jsonResponse({}));

    const result = await moveOpportunityToReportSentToClient(config, '26-100A-01');
    expect(result).toEqual({ status: 'updated', opportunityId: 'opp-1' });

    const putCall = mockFetch.mock.calls.find(
      (call) => typeof call[0] === 'string' && String(call[0]).includes('/opportunities/opp-1')
    );
    expect(putCall?.[1]).toEqual(
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          pipelineId: 'pipe-1',
          pipelineStageId: 'stage-sent',
        }),
      })
    );
  });

  it('no-ops when already on Report Sent to Client', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          opportunities: [
            {
              id: 'opp-1',
              pipelineStageId: 'stage-sent',
              customFields: [{ key: 'job_number', fieldValue: '26-100A-01' }],
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          pipelines: [
            {
              id: 'pipe-1',
              stages: [{ id: 'stage-sent', name: 'Report Sent to Client' }],
            },
          ],
        })
      );

    const result = await moveOpportunityToReportSentToClient(config, '26-100A-01');
    expect(result).toEqual({ status: 'already_on_stage', opportunityId: 'opp-1' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns not_found when no custom-field match', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        opportunities: [
          {
            id: 'opp-other',
            customFields: [{ key: 'job_number', fieldValue: '99-999Z-99' }],
          },
        ],
      })
    );

    const result = await moveOpportunityToReportSentToClient(config, '26-100A-01');
    expect(result).toEqual({ status: 'not_found' });
  });

  it('returns ambiguous when multiple exact matches', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        opportunities: [
          {
            id: 'opp-1',
            customFields: [{ key: 'job_number', fieldValue: '26-100A-01' }],
          },
          {
            id: 'opp-2',
            customFields: [{ key: 'opportunity.job_number', fieldValue: '26-100A-01' }],
          },
        ],
      })
    );

    const result = await moveOpportunityToReportSentToClient(config, '26-100A-01');
    expect(result).toEqual({
      status: 'ambiguous',
      opportunityIds: ['opp-1', 'opp-2'],
    });
  });
});

describe('getGhlConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetGhlMissingConfigLogForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null when env is incomplete', () => {
    delete process.env.GHL_TOKEN;
    delete process.env.GHL_LOCATION_ID;
    delete process.env.GHL_PIPELINE_ID;
    expect(getGhlConfig()).toBeNull();
  });

  it('returns config when all vars are set', () => {
    process.env.GHL_TOKEN = 'pit-abc';
    process.env.GHL_LOCATION_ID = 'loc';
    process.env.GHL_PIPELINE_ID = 'pipe';
    expect(getGhlConfig()).toEqual({
      token: 'pit-abc',
      locationId: 'loc',
      pipelineId: 'pipe',
    });
  });
});
