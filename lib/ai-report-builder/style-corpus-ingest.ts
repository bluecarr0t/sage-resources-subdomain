/**
 * Persist redacted style-corpus sections + embeddings for RAG few-shots.
 */

import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { extractRawContentFromDocx } from '@/lib/parsers/feasibility-docx-parser';
import { redactStyleCorpusText } from './style-corpus-redact';
import {
  extractStyleSectionsFromRaw,
  isHoldoutStudyId,
} from './style-corpus-extract';
import {
  DEFAULT_STYLE_HOLDOUT_STUDY_PATTERNS,
} from './style-corpus-types';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;
const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

export function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 64);
}

export function createStyleCorpusEmbeddingClient(
  env: NodeJS.ProcessEnv = process.env
): OpenAI | null {
  const gatewayKey = env.AI_GATEWAY_API_KEY?.trim();
  const openaiKey = env.OPENAI_API_KEY?.trim();
  if (gatewayKey) {
    return new OpenAI({
      apiKey: gatewayKey,
      baseURL: GATEWAY_BASE_URL,
    });
  }
  if (openaiKey) {
    return new OpenAI({ apiKey: openaiKey });
  }
  return null;
}

async function embedText(openai: OpenAI, text: string): Promise<number[] | null> {
  const input = text.slice(0, 8000);
  const model = process.env.AI_GATEWAY_API_KEY?.trim()
    ? 'openai/text-embedding-3-small'
    : EMBEDDING_MODEL;
  try {
    const res = await openai.embeddings.create({ model, input });
    const embedding = res.data?.[0]?.embedding;
    if (!embedding || embedding.length !== EMBEDDING_DIM) return null;
    return embedding;
  } catch (err) {
    // Gateway may reject openai/ prefix on some accounts — retry bare model id
    if (model.startsWith('openai/')) {
      try {
        const res = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input,
        });
        const embedding = res.data?.[0]?.embedding;
        if (!embedding || embedding.length !== EMBEDDING_DIM) return null;
        return embedding;
      } catch {
        console.warn('[style-corpus] embed failed:', err);
        return null;
      }
    }
    console.warn('[style-corpus] embed failed:', err);
    return null;
  }
}

export interface StyleCorpusReportMeta {
  id: string;
  study_id?: string | null;
  market_type?: string | null;
  client_name?: string | null;
  client_entity?: string | null;
  property_name?: string | null;
  docx_file_path?: string | null;
  narrative_file_path?: string | null;
}

export interface UpsertStyleCorpusResult {
  upserted: number;
  skipped: number;
  dropped: number;
  errors: string[];
  sections: string[];
}

function holdoutPatterns(env: NodeJS.ProcessEnv = process.env): string[] {
  const fromEnv = env.REPORT_STYLE_HOLDOUT_STUDY_IDS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return [...DEFAULT_STYLE_HOLDOUT_STUDY_PATTERNS];
}

/**
 * Extract, redact, embed, and upsert style sections from a DOCX buffer.
 */
export async function upsertStyleCorpusFromDocxBuffer(params: {
  supabase: SupabaseClient;
  openai: OpenAI;
  report: StyleCorpusReportMeta;
  buffer: Buffer;
  filename?: string;
  force?: boolean;
}): Promise<UpsertStyleCorpusResult> {
  const { supabase, openai, report, buffer, filename, force } = params;
  const result: UpsertStyleCorpusResult = {
    upserted: 0,
    skipped: 0,
    dropped: 0,
    errors: [],
    sections: [],
  };

  // Skip draft / profile-only shells
  const studyId = report.study_id ?? '';
  if (/^DRAFT-/i.test(studyId)) {
    result.dropped += 1;
    result.errors.push('skipped_draft_study');
    return result;
  }

  let raw;
  try {
    raw = await extractRawContentFromDocx(buffer, filename ?? `${studyId}.docx`);
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'docx_parse_failed');
    return result;
  }

  const sections = extractStyleSectionsFromRaw(raw);
  if (sections.length === 0) {
    result.dropped += 1;
    result.errors.push('no_sections');
    return result;
  }

  const isHoldout = isHoldoutStudyId(studyId, holdoutPatterns());
  const marketType = report.market_type?.toLowerCase() ?? null;

  for (const sec of sections) {
    const redacted = redactStyleCorpusText(sec.rawText, {
      clientName: report.client_name,
      clientEntity: report.client_entity,
      propertyName: report.property_name,
    });
    if (redacted.dropped || !redacted.redactedText) {
      result.dropped += 1;
      continue;
    }

    const hash = contentHash(redacted.redactedText);
    if (!force) {
      const { data: existing } = await supabase
        .from('report_section_corpus')
        .select('content_hash')
        .eq('report_id', report.id)
        .eq('section', sec.section)
        .maybeSingle();
      if (existing?.content_hash === hash) {
        result.skipped += 1;
        continue;
      }
    }

    const embedding = await embedText(openai, redacted.redactedText);
    if (!embedding) {
      result.errors.push(`embed_failed:${sec.section}`);
      continue;
    }

    const { error } = await supabase.from('report_section_corpus').upsert(
      {
        report_id: report.id,
        study_id: studyId || null,
        section: sec.section,
        market_type: marketType,
        raw_text: sec.rawText.slice(0, 12_000),
        redacted_text: redacted.redactedText,
        content_hash: hash,
        is_holdout: isHoldout,
        embedding,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'report_id,section' }
    );

    if (error) {
      result.errors.push(`${sec.section}:${error.message}`);
      continue;
    }
    result.upserted += 1;
    result.sections.push(sec.section);
  }

  return result;
}

/**
 * Fire-and-forget style corpus extract for a single report after DOCX ingest.
 * Safe to call without awaiting in request handlers (still returns a promise).
 */
export async function enqueueStyleCorpusExtractForReport(params: {
  supabase: SupabaseClient;
  reportId: string;
  studyId?: string | null;
}): Promise<UpsertStyleCorpusResult | null> {
  const openai = createStyleCorpusEmbeddingClient();
  if (!openai) {
    console.warn('[style-corpus] skip enqueue: no AI_GATEWAY_API_KEY or OPENAI_API_KEY');
    return null;
  }

  const { data: report, error } = await params.supabase
    .from('reports')
    .select(
      'id, study_id, market_type, client_name, client_entity, property_name, docx_file_path, narrative_file_path, has_docx'
    )
    .eq('id', params.reportId)
    .maybeSingle();

  if (error || !report) {
    console.warn('[style-corpus] report not found for enqueue', params.reportId, error?.message);
    return null;
  }

  const docxPath =
    report.docx_file_path ??
    (report.narrative_file_path?.toLowerCase().endsWith('.docx') ||
    report.narrative_file_path?.toLowerCase().endsWith('.doc')
      ? report.narrative_file_path
      : null);

  if (!docxPath) {
    console.warn('[style-corpus] no docx path for', report.study_id ?? report.id);
    return null;
  }

  const { data: fileData, error: dlError } = await params.supabase.storage
    .from('report-uploads')
    .download(docxPath);

  if (dlError || !fileData) {
    console.warn('[style-corpus] download failed', docxPath, dlError?.message);
    return null;
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  return upsertStyleCorpusFromDocxBuffer({
    supabase: params.supabase,
    openai,
    report,
    buffer,
    filename: docxPath.split('/').pop() ?? undefined,
  });
}
