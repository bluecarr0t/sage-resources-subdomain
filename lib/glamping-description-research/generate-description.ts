import OpenAI from 'openai';
import { createChatCompletionWithRetry } from '@/lib/comps-v2/openai-chat-completion-with-retry';

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';
export const PROMPT_VERSION = 'v1';

function resolveOpenAI(env: NodeJS.ProcessEnv): { client: OpenAI; model: string } | null {
  const gatewayKey = env.AI_GATEWAY_API_KEY?.trim();
  const openaiKey = env.OPENAI_API_KEY?.trim();
  if (!gatewayKey && !openaiKey) return null;
  const configured = env.GLAMPING_DESCRIPTION_MODEL?.trim() || 'gpt-4o-mini';
  if (gatewayKey) {
    const model = configured.includes('/') ? configured : `openai/${configured}`;
    return {
      client: new OpenAI({ apiKey: gatewayKey, baseURL: GATEWAY_BASE_URL }),
      model,
    };
  }
  const directModel = configured.replace(/^openai\//, '');
  return { client: new OpenAI({ apiKey: openaiKey! }), model: directModel };
}

interface LlmJsonShape {
  description?: string;
  notes_for_editor?: string;
}

function parseJsonContent(raw: string): LlmJsonShape | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object') return null;
    return o as LlmJsonShape;
  } catch {
    return null;
  }
}

/** Model may wrap JSON in fences; strip before parse. */
function parseJsonFromModelResponse(raw: string): LlmJsonShape | null {
  const trimmed = raw.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const body = fence ? fence[1].trim() : trimmed;
  let parsed = parseJsonContent(body);
  if (parsed) return parsed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start >= 0 && end > start) {
    parsed = parseJsonContent(body.slice(start, end + 1));
  }
  return parsed;
}

/**
 * Generate a single plain-text SEO description from DB summary + page evidence.
 */
export async function generateSeoDescriptionFromEvidence(options: {
  env: NodeJS.ProcessEnv;
  dbSummary: string;
  evidenceText: string;
  sourceUrl: string;
}): Promise<
  | { ok: true; description: string; model: string; notesForEditor: string | null }
  | { ok: false; message: string; model: string | null }
> {
  const resolved = resolveOpenAI(options.env);
  if (!resolved) {
    return { ok: false, message: 'Missing AI_GATEWAY_API_KEY or OPENAI_API_KEY.', model: null };
  }
  const { client, model } = resolved;

  const system = [
    'You are an expert travel copywriter and SEO editor for outdoor hospitality.',
    'Write ONE cohesive property description in plain text (no HTML, no markdown headings, no bullet lists).',
    'Use only facts supported by the DATABASE FACTS block and the WEBSITE EXCERPT. If a detail is not supported, omit it.',
    'Do not invent awards, rankings, proximity to specific landmarks, prices, or amenities.',
    'Tone: welcoming and specific; avoid superlatives like "best" or "world-class" unless directly quoted from the excerpt.',
    'Naturally include local SEO: city, state/region, and property name where it reads well.',
    'Target length: about 130–200 words (do not submit under 115 words).',
    'Respond with JSON only: {"description":"...","notes_for_editor":"optional short note"}.',
  ].join(' ');

  const user = [
    'DATABASE FACTS (authoritative for what we store):',
    options.dbSummary,
    '',
    `WEBSITE SOURCE URL: ${options.sourceUrl}`,
    '',
    'WEBSITE EXCERPT (may be incomplete; prefer DATABASE FACTS on conflict):',
    options.evidenceText.slice(0, 24_000),
  ].join('\n');

  try {
    const completion = await createChatCompletionWithRetry(client, {
      model,
      temperature: 0.35,
      max_tokens: 1100,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    const parsed = parseJsonFromModelResponse(raw);
    if (!parsed) {
      return { ok: false, message: 'Model returned empty or invalid JSON description.', model };
    }
    const desc = parsed.description?.trim();
    if (!desc) {
      return { ok: false, message: 'Model returned empty or invalid JSON description.', model };
    }
    const notes =
      parsed.notes_for_editor != null && String(parsed.notes_for_editor).trim()
        ? String(parsed.notes_for_editor).trim()
        : null;
    return { ok: true, description: desc, model, notesForEditor: notes };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg, model };
  }
}
