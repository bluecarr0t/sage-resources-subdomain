import FirecrawlApp from '@mendable/firecrawl-js';
import { summarizeRowForDescription } from '@/lib/glamping-description-research/db-row-summary';
import { fetchPrimaryUrlEvidence } from '@/lib/glamping-description-research/fetch-evidence';
import {
  generateSeoDescriptionFromEvidence,
  PROMPT_VERSION,
} from '@/lib/glamping-description-research/generate-description';
import type {
  DescriptionPipelineFailure,
  DescriptionPipelineResult,
  DescriptionPipelineSuccess,
} from '@/lib/glamping-description-research/types';
import { validateSeoDescription } from '@/lib/glamping-description-research/validate-description';

export interface RunDescriptionPipelineOptions {
  row: Record<string, unknown>;
  env: NodeJS.ProcessEnv;
  firecrawlApiKey: string | null;
}

function fail(
  code: DescriptionPipelineFailure['code'],
  message: string,
  partial: Pick<DescriptionPipelineFailure, 'sourceUrls' | 'evidenceChars' | 'model' | 'validationWarnings'>
): DescriptionPipelineFailure {
  return {
    ok: false,
    code,
    message,
    sourceUrls: partial.sourceUrls,
    evidenceChars: partial.evidenceChars,
    model: partial.model,
    promptVersion: PROMPT_VERSION,
    validationWarnings: partial.validationWarnings,
  };
}

function success(
  r: Omit<DescriptionPipelineSuccess, 'ok' | 'promptVersion'>
): DescriptionPipelineSuccess {
  return { ok: true, promptVersion: PROMPT_VERSION, ...r };
}

/**
 * End-to-end: fetch official site text → LLM SEO description → validate.
 */
export async function runGlampingDescriptionPipeline(
  options: RunDescriptionPipelineOptions
): Promise<DescriptionPipelineResult> {
  const url = options.row.url != null ? String(options.row.url) : '';
  const firecrawl =
    options.firecrawlApiKey && options.firecrawlApiKey.trim()
      ? new FirecrawlApp({ apiKey: options.firecrawlApiKey.trim() })
      : null;

  const fetched = await fetchPrimaryUrlEvidence(url, { firecrawl });
  if (!fetched.ok) {
    const code = !url.trim()
      ? 'no_url'
      : fetched.message.includes('SSRF')
        ? 'unsafe_url'
        : 'fetch_failed';
    return fail(code, fetched.message, {
      sourceUrls: [],
      evidenceChars: 0,
      model: null,
      validationWarnings: [],
    });
  }

  const item = fetched.items[0];
  const evidenceChars = item.text.length;
  const dbSummary = summarizeRowForDescription(options.row);

  const gen = await generateSeoDescriptionFromEvidence({
    env: options.env,
    dbSummary,
    evidenceText: item.text,
    sourceUrl: item.url,
  });
  if (!gen.ok) {
    return fail('llm_failed', gen.message, {
      sourceUrls: [item.url],
      evidenceChars,
      model: gen.model,
      validationWarnings: [],
    });
  }

  const v = validateSeoDescription({
    text: gen.description,
    city: options.row.city != null ? String(options.row.city) : null,
    state: options.row.state != null ? String(options.row.state) : null,
    propertyName: options.row.property_name != null ? String(options.row.property_name) : null,
  });

  if (!v.ok) {
    return fail('validation_failed', v.errors.join(' '), {
      sourceUrls: [item.url],
      evidenceChars,
      model: gen.model,
      validationWarnings: [...v.warnings, ...v.errors],
    });
  }

  return success({
    description: gen.description,
    sourceUrls: [item.url],
    evidenceChars,
    model: gen.model,
    validationWarnings: v.warnings,
  });
}
