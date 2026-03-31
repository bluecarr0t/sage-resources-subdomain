/**
 * @jest-environment node
 */

import { enrichCompDeep } from '@/lib/comps-v2/deep-enrich';

const completionCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => completionCreate(...args),
      },
    },
  }));
});

jest.mock('@/lib/comps-v2/scrape-url', () => ({
  scrapeUrlMarkdown: jest.fn(),
}));

jest.mock('@/lib/comps-v2/google-place-deep-enrich', () => ({
  fetchGoogleBusinessProfileContext: jest.fn(),
}));

jest.mock('@tavily/core', () => ({
  tavily: jest.fn(),
}));

import { scrapeUrlMarkdown } from '@/lib/comps-v2/scrape-url';
import { fetchGoogleBusinessProfileContext } from '@/lib/comps-v2/google-place-deep-enrich';

describe('enrichCompDeep multi-step LLM', () => {
  /** Explicit gateway models via env (matches production `.env.local` pattern). */
  const EXTRACTION_MODEL = 'anthropic/claude-sonnet-4.6';
  const CONDENSE_MODEL = 'anthropic/claude-haiku-4.5';

  beforeEach(() => {
    jest.clearAllMocks();
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('COMPS_V2_') || k === 'AI_GATEWAY_API_KEY' || k === 'OPENAI_API_KEY' || k === 'TAVILY_API_KEY') {
        delete process.env[k];
      }
    }
    process.env.AI_GATEWAY_API_KEY = 'test-gateway';
    process.env.TAVILY_API_KEY = '';
    process.env.COMPS_V2_DEEP_ENRICH_MODEL = EXTRACTION_MODEL;

    (fetchGoogleBusinessProfileContext as jest.Mock).mockResolvedValue('');
    (scrapeUrlMarkdown as jest.Mock).mockResolvedValue({ ok: false, reason: 'invalid_url' });

    completionCreate.mockImplementation(
      async (req: { response_format?: { type: string }; model?: string }) => {
        if (req.response_format?.type === 'json_object') {
          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: 'ok',
                    amenities: [],
                    rates_notes: '',
                    unit_type_rates: [],
                    review_highlights: '',
                    google_business_notes: '',
                    sources_cited: [],
                  }),
                },
              },
            ],
          };
        }
        return { choices: [{ message: { content: '## Condensed\n- rate $100' } }] };
      }
    );
  });

  it('uses COMPS_V2_DEEP_ENRICH_MODEL only when COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL is unset', async () => {
    (scrapeUrlMarkdown as jest.Mock).mockResolvedValue({
      ok: true,
      markdown: 'x'.repeat(8000),
    });
    delete process.env.COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL;

    const res = await enrichCompDeep({
      property_name: 'Test Inn',
      city: 'Austin',
      state: 'TX',
      url: 'https://example.com/p',
    });

    expect(res.error).toBeUndefined();
    expect(completionCreate).toHaveBeenCalledTimes(1);
    expect(completionCreate.mock.calls[0][0]).toMatchObject({
      model: EXTRACTION_MODEL,
      response_format: { type: 'json_object' },
    });
  });

  it('uses COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL then COMPS_V2_DEEP_ENRICH_MODEL when bundle exceeds threshold', async () => {
    process.env.COMPS_V2_DEEP_ENRICH_MODEL = 'openai/gpt-5.4';
    process.env.COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL = CONDENSE_MODEL;
    process.env.COMPS_V2_DEEP_ENRICH_CONDENSE_MIN_CHARS = '1000';
    (scrapeUrlMarkdown as jest.Mock).mockResolvedValue({
      ok: true,
      markdown: 'y'.repeat(2000),
    });

    const res = await enrichCompDeep({
      property_name: 'Big Resort',
      city: 'Denver',
      state: 'CO',
      url: 'https://example.com/r',
    });

    expect(res.structured.summary).toBe('ok');
    expect(completionCreate).toHaveBeenCalledTimes(2);
    expect(completionCreate.mock.calls[0][0].model).toBe(CONDENSE_MODEL);
    expect(completionCreate.mock.calls[0][0].response_format).toBeUndefined();
    expect(completionCreate.mock.calls[1][0].model).toBe('openai/gpt-5.4');
    expect(completionCreate.mock.calls[1][0].response_format).toEqual({ type: 'json_object' });
  });

  it('skips condense when bundle is below threshold even if COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL is set', async () => {
    process.env.COMPS_V2_DEEP_ENRICH_CONDENSE_MODEL = CONDENSE_MODEL;
    process.env.COMPS_V2_DEEP_ENRICH_CONDENSE_MIN_CHARS = '50000';
    (scrapeUrlMarkdown as jest.Mock).mockResolvedValue({
      ok: true,
      markdown: 'short',
    });

    await enrichCompDeep({
      property_name: 'Tiny',
      city: 'Austin',
      state: 'TX',
      url: 'https://example.com/t',
    });

    expect(completionCreate).toHaveBeenCalledTimes(1);
    expect(completionCreate.mock.calls[0][0].model).toBe(EXTRACTION_MODEL);
  });
});
