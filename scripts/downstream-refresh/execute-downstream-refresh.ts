import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { PoolClient } from 'pg';
import { getSupabaseDirectPool } from '../../lib/supabase-direct-db';
import { invalidateCompsUnifiedFacetsCache } from './invalidate-comps-facets-cache';
import { refreshRvOverviewCache } from './refresh-rv-overview';
import { refreshUnifiedCompsMatview } from './refresh-unified-comps';

const AUDIT_SQL_PATH = resolve(
  process.cwd(),
  'scripts/migrations/downstream-refresh/01-downstream-refresh-audit.sql'
);

export type DownstreamStep = 'unified_comps' | 'facets_cache' | 'rv_overview';

export interface DownstreamRefreshOptions {
  steps?: DownstreamStep[];
  dryRun?: boolean;
  triggerSource?: string;
  pgClient?: PoolClient;
}

export interface DownstreamStepResult {
  step: DownstreamStep;
  status: 'success' | 'skipped' | 'failed';
  durationMs?: number;
  detail?: Record<string, unknown>;
  error?: string;
}

export interface DownstreamRefreshResult {
  runId: number | null;
  status: 'success' | 'failed' | 'dry_run';
  steps: DownstreamStepResult[];
}

const DEFAULT_STEPS: DownstreamStep[] = ['unified_comps', 'facets_cache', 'rv_overview'];

async function ensureAuditTable(client: PoolClient): Promise<void> {
  await client.query(readFileSync(AUDIT_SQL_PATH, 'utf8'));
}

async function startAuditRun(
  client: PoolClient,
  triggerSource: string,
  options: DownstreamRefreshOptions
): Promise<number> {
  const res = await client.query<{ id: string }>(
    `
    INSERT INTO public.downstream_refresh_runs (trigger_source, status, options)
    VALUES ($1, 'running', $2::jsonb)
    RETURNING id
  `,
    [triggerSource, JSON.stringify(options)]
  );
  return parseInt(res.rows[0]!.id, 10);
}

async function finishAuditRun(
  client: PoolClient,
  runId: number,
  status: 'success' | 'failed',
  steps: DownstreamStepResult[],
  errorMessage?: string
): Promise<void> {
  await client.query(
    `
    UPDATE public.downstream_refresh_runs
    SET
      finished_at = now(),
      status = $2,
      steps = $3::jsonb,
      error_message = $4
    WHERE id = $1
  `,
    [runId, status, JSON.stringify(steps), errorMessage ?? null]
  );
}

export async function executeDownstreamRefresh(
  options: DownstreamRefreshOptions = {}
): Promise<DownstreamRefreshResult> {
  const stepsToRun = options.steps ?? DEFAULT_STEPS;
  const dryRun = options.dryRun ?? false;
  const triggerSource = options.triggerSource ?? 'cli';
  const steps: DownstreamStepResult[] = [];

  const pool = getSupabaseDirectPool();
  const ownsClient = !options.pgClient;
  const client = options.pgClient ?? (await pool.connect());

  let runId: number | null = null;

  try {
    if (!dryRun) {
      await ensureAuditTable(client);
      runId = await startAuditRun(client, triggerSource, options);
    }

    if (stepsToRun.includes('unified_comps')) {
      if (dryRun) {
        steps.push({
          step: 'unified_comps',
          status: 'skipped',
          detail: { message: 'would REFRESH MATERIALIZED VIEW CONCURRENTLY public.unified_comps' },
        });
      } else {
        try {
          console.log('\nRefreshing public.unified_comps...');
          const result = await refreshUnifiedCompsMatview(client);
          console.log(
            `  unified_comps: ${result.mode} refresh, ${result.rowCount?.toLocaleString() ?? '?'} rows, ${result.durationMs}ms`
          );
          steps.push({
            step: 'unified_comps',
            status: 'success',
            durationMs: result.durationMs,
            detail: { mode: result.mode, rowCount: result.rowCount },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          steps.push({ step: 'unified_comps', status: 'failed', error: message });
          throw err;
        }
      }
    }

    if (stepsToRun.includes('facets_cache')) {
      if (dryRun) {
        steps.push({
          step: 'facets_cache',
          status: 'skipped',
          detail: { message: 'would invalidate Upstash comps facets keys' },
        });
      } else {
        try {
          console.log('\nInvalidating comps unified facets cache...');
          const result = await invalidateCompsUnifiedFacetsCache();
          console.log(
            `  facets cache: ${result.invalidated ? 'cleared' : 'skipped (no Upstash)'} ${result.keys.join(', ')}`
          );
          steps.push({
            step: 'facets_cache',
            status: 'success',
            detail: result,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          steps.push({ step: 'facets_cache', status: 'failed', error: message });
          throw err;
        }
      }
    }

    if (stepsToRun.includes('rv_overview')) {
      if (dryRun) {
        steps.push({
          step: 'rv_overview',
          status: 'skipped',
          detail: { message: 'would recompute campspot_rv_overview_cache from public.campspot' },
        });
      } else {
        try {
          console.log('\nRefreshing RV Industry Overview cache (campspot scan)...');
          const result = await refreshRvOverviewCache();
          console.log(
            `  rv_overview: scanned ${result.rowsScanned.toLocaleString()} rows, ${result.durationMs}ms` +
              (result.mapError ? `, map error: ${result.mapError}` : '')
          );
          steps.push({
            step: 'rv_overview',
            status: 'success',
            durationMs: result.durationMs,
            detail: { rowsScanned: result.rowsScanned, mapError: result.mapError },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          steps.push({ step: 'rv_overview', status: 'failed', error: message });
          throw err;
        }
      }
    }

    if (runId != null) {
      await finishAuditRun(client, runId, 'success', steps);
    }

    return {
      runId,
      status: dryRun ? 'dry_run' : 'success',
      steps,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId != null) {
      await finishAuditRun(client, runId, 'failed', steps, message);
    }
    return {
      runId,
      status: 'failed',
      steps,
    };
  } finally {
    if (ownsClient) {
      client.release();
    }
  }
}
