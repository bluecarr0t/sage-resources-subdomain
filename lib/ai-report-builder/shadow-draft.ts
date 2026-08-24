/**
 * Shadow draft generation: gpt-4o vs Claude Opus 5 for analyst review.
 */

import type { EnrichedInput } from './types';
import {
  generateExecutiveSummary,
  generateSWOTAnalysis,
} from './generate';
import {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_OPENAI_MODEL,
  resolveReportLlmModel,
} from './llm-provider';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ShadowDraftBundle {
  primary_model: string;
  shadow_model: string;
  primary: {
    executive_summary: string;
    letter_of_transmittal: string;
    swot_analysis: string;
  };
  shadow: {
    executive_summary: string;
    letter_of_transmittal: string;
    swot_analysis: string;
  };
  generated_at: string;
}

function isShadowEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env.REPORT_SHADOW_LLM?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'on';
}

/**
 * Generate a compact shadow bundle with the alternate model.
 * Primary content should already be generated with the default model;
 * this temporarily overrides REPORT_LLM_MODEL via chatCompletion options.
 *
 * Note: section generators read model from resolveReportLlmModel() unless
 * we pass model through — we re-run with env override for the shadow pass.
 */
export async function generateShadowDraftBundle(
  enriched: EnrichedInput,
  modelMetricsText: string | null | undefined,
  primary: {
    executive_summary: string;
    letter_of_transmittal: string;
    swot_analysis: string;
  }
): Promise<ShadowDraftBundle | null> {
  if (!isShadowEnabled()) return null;

  const primaryModel = resolveReportLlmModel();
  const shadowModel =
    process.env.REPORT_SHADOW_MODEL?.trim() ||
    (primaryModel.includes('claude') ? DEFAULT_OPENAI_MODEL : DEFAULT_CLAUDE_MODEL);

  const prev = process.env.REPORT_LLM_MODEL;
  process.env.REPORT_LLM_MODEL = shadowModel;
  try {
    const [exec, swot] = await Promise.all([
      generateExecutiveSummary(enriched, modelMetricsText),
      generateSWOTAnalysis(enriched),
    ]);

    return {
      primary_model: primaryModel,
      shadow_model: shadowModel,
      primary,
      shadow: {
        executive_summary: exec.executive_summary,
        letter_of_transmittal: '',
        swot_analysis: swot,
      },
      generated_at: new Date().toISOString(),
    };
  } finally {
    if (prev === undefined) delete process.env.REPORT_LLM_MODEL;
    else process.env.REPORT_LLM_MODEL = prev;
  }
}

export async function uploadShadowDraftBundle(params: {
  supabase: SupabaseClient;
  reportId: string;
  bundle: ShadowDraftBundle;
  bucket?: string;
}): Promise<string | null> {
  const bucket = params.bucket ?? 'report-uploads';
  const path = `${params.reportId}/shadow/compare-${Date.now()}.json`;
  const body = Buffer.from(JSON.stringify(params.bundle, null, 2), 'utf8');
  const { error } = await params.supabase.storage.from(bucket).upload(path, body, {
    contentType: 'application/json',
    upsert: true,
  });
  if (error) {
    console.warn('[shadow-draft] upload failed:', error.message);
    return null;
  }
  return path;
}
